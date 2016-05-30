###
### This script was written to combine CNV data files that were downloaded
### from TCGA and to create a sql script to load the data in mexpress.
###
### usage:
### Rscript processTCGAcnv.R source full_source_name path/to/gene/annotation/file path/to/gene/names/file
### The gene annotation file should contain the gene annotation data from UCSC
### in the following format:
### Ensembl ID | HGNC symbol | chr | gene start | gene end | strand
### The gene names file contains a single column with the HGMC symbols of the genes for which there is
### TCGA expression data.
###
##
#
# Alexander Koch
# 2016
#

library("data.table")

# Read the command line arguments that specify the TCGA data source 
args = commandArgs(trailingOnly = T)
# Specify the TCGA data source (eg. skcm = skin_cutaneous_melanoma).
source = args[1]
fullSourceName = args[2]
fullSourceName = gsub("_", " ", fullSourceName)
geneAnnFile = args[3]
geneNamesFile = args[4]

# Specify the folder where the data files are stored.
dataDir = sub("/$", "", source)
dataDir = paste(dataDir, "/", sep="")
# Get all the necessary file & folder names.
allFiles = grep("^broad\\.mit\\.edu", dir(dataDir), value=T)
annFolders = grep("mage-tab", allFiles, value=T)
dataFolders = grep("Level_3", allFiles, value=T)

# Specify where to store the data.
dataFile = paste(source, "/tcga_cnv_data_", source, ".txt", sep="")

# Go through the folders that contain the annotation data and extract the file names and
# TCGA barcodes from the annotation files stored in these folders.
allAnn = matrix(nrow=0, ncol=2)
for (t in 1:length(annFolders)){
	annFolder = paste(source, "/", annFolders[t], sep="")
	annFile = paste(annFolder, "/", grep("sdrf\\.txt$", dir(annFolder), value=T), sep="")
	ann = fread(annFile, data.table=F, colClasses="character")
	barcode = grep("Barcode", colnames(ann), value=T)
	fileName = grep("Hybridization Name", colnames(ann), value=T)
	ann = ann[,c(barcode, fileName)]
	ann = na.omit(ann)
	colnames(ann) = c("barcode", "sample")
	allAnn = rbind(allAnn, ann)
}
allAnn = data.frame(allAnn, stringsAsFactors=F)
allAnn = unique(allAnn)

# Go through the folders that contain the CNV data and extract the CNV values.
# The CNV data is mapped to chromosomal regions. Using gene annotation data from the
# UCSC genome browser we will convert this chromosome region mapping to gene mapping.
# The annotation data we previously extracted from the mage-tab files is used to link
# the CNV data to the corresponding TCGA sample barcode.
geneAnn = fread(geneAnnFile, data.table=F)
geneNames = fread(geneNamesFile, data.table=F, header=F)
geneAnn = geneAnn[geneAnn$hgnc_symbol %in% geneNames[,1],]
#geneAnn = geneAnn[order(geneAnn$hgnc_symbol),]
# Create a list of the gene annotations by splitting the genes up by chromosome.
# This will speed up processing later on.
geneAnnList = list()
uniqueChr = unique(geneAnn$chr)
for (t in 1:length(uniqueChr)){
	geneAnnList[[uniqueChr[t]]] = geneAnn[geneAnn$chr == uniqueChr[t],]
}

print("processing CNV data folders...")
# Find all the files we need to process.
cnvDataFiles = vector()
for (t in 1:length(dataFolders)){
	dataFolder = paste(source, "/", dataFolders[t], sep="")
	cnvDataFiles = c(cnvDataFiles, paste(dataFolder, "/", dir(dataFolder), sep=""))
}
print(paste("processing ", length(cnvDataFiles), " CNV data files...", sep=""))
# Get the CN data.
cnvData = lapply(cnvDataFiles, function(x, g){	
	segmentData = suppressWarnings(fread(x, data.table=F))
	segChr = unique(segmentData$Chromosome)
	sampleCnvData = list()
	for (t in 1:length(segChr)){
		chrAnn = g[[segChr[t]]]
		chrSeg = segmentData[segmentData$Chromosome == segChr[t],]
		chrAnn$cn = apply(chrAnn, 1, function(xx, s){
			segMean = s[s$Start <= xx[4] & s$End >= xx[5],]$Segment_Mean
			return(ifelse(length(segMean) !=0, mean(segMean, na.rm=T), NA))
		}, s=chrSeg)
		sampleCnvData[[t]] = chrAnn[,c("hgnc_symbol", "cn")]
	}
	# Combine the CN data of the different chromosomes.
	sampleCnvData = do.call("rbind", sampleCnvData)	
	return(sampleCnvData)
}, g=geneAnnList)
# Combine all the data in a single table.
cnvDataTable = do.call("cbind", cnvData)
cnvDataTable = cnvDataTable[,c(1, grep("cn", colnames(cnvDataTable)))]
# Get the sample names.
cnvSamples = sapply(cnvDataFiles, function(x, a){
	data = fread(x, data.table=F, nrows=1)
	barcode = a[a$sample == data$Sample[1],]$barcode
	return(barcode)
}, a=allAnn)
# Add the sample names to the CN data.
colnames(cnvDataTable)[2:ncol(cnvDataTable)] = cnvSamples
# Remove rows with only NAs.
cnvDataTable = cnvDataTable[rowSums(!is.na(cnvDataTable[,-1])) != 0,]

# Aggregate the duplicate samples.
colnames(cnvDataTable) = sub("-.{3}-.{4}-.{2}$", "", colnames(cnvDataTable))
colnames(cnvDataTable) = sub("[ABCDEFGHIJKLMNOPQRSTUVWXYZ]$", "", colnames(cnvDataTable))
duplicatedSamples = colnames(cnvDataTable)[duplicated(colnames(cnvDataTable))]
duplicatedSamples = unique(duplicatedSamples)
dup = cnvDataTable[,colnames(cnvDataTable) %in% duplicatedSamples]
cnv = cnvDataTable[,!colnames(cnvDataTable) %in% duplicatedSamples]
dupResult = matrix(nrow=nrow(dup), ncol=0)
for (t in 1:length(duplicatedSamples)){
	sub = dup[,grep(duplicatedSamples[t], colnames(dup))]
	dupResult = cbind(dupResult, rowMeans(sub))
}
colnames(dupResult) = duplicatedSamples
dupResult = data.frame(dupResult, stringsAsFactors=F)
colnames(dupResult) = gsub("\\.", "-", colnames(dupResult))
cnv = cbind(cnv, dupResult)
colnames(cnv) = gsub("-", "_", colnames(cnv))

# Replace the NA values with \N so that MySQL will recognize that these values are missing instead of replacing them with 0.
cnv[is.na(cnv)] = "\\N"

# Build the SQL query.
tableName = paste("cnv_", source, sep="")
sqlQuery = paste("DROP TABLE IF EXISTS ", tableName, ";\nCREATE TABLE ", tableName, "(gene_name VARCHAR(15),\n", sep="")
dataInfoQuery = paste("DELETE FROM data_information WHERE source = '", source, "' AND experiment_type = 'cnv' AND technology = 'snp array';\n", sep="")
for (t in 2:ncol(cnv)){
	sample = colnames(cnv)[t]
	sqlQuery = paste(sqlQuery, paste(sample, " DECIMAL(6,4),\n", sep=""))
	dataInfoQuery = paste(dataInfoQuery, "INSERT INTO data_information (sample_name, data_table, source, full_source_name, experiment_type, technology) VALUES ('", sample, "', '", tableName, "', '", source, "', '", fullSourceName, "', 'cnv', 'snp array');\n", sep="")
}

# Remove the trailing comma from the sql query.
sqlQuery = sub(",\n$", "\n", sqlQuery)

# Add the LOAD DATA statements to the sql query.
if (ncol(cnv) >= 999){
	sqlQuery = paste(sqlQuery, ")\nENGINE = MyISAM;\nLOAD DATA LOCAL INFILE '", dataFile, "' INTO TABLE ", tableName, " IGNORE 1 LINES;\nCREATE INDEX gene_name_index ON ", tableName, " (gene_name);", sep="")
} else {
	sqlQuery = paste(sqlQuery, ");\nLOAD DATA LOCAL INFILE '", dataFile, "' INTO TABLE ", tableName, " IGNORE 1 LINES;\nCREATE INDEX gene_name_index ON ", tableName, " (gene_name);", sep="")
}

# Write the sql queries to a file.
cat(sqlQuery, file=paste(source, "/load_", tableName, ".sql", sep=""), sep="")
cat(dataInfoQuery, file=paste(source, "/update_data_information_cnv_", source, ".sql", sep=""), sep="")

# Write the result to a file.
write.table(cnv, dataFile, col.names=T, row.names=F, quote=F, sep="\t")