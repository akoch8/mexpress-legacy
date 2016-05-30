###
### This script was written to combine copy number data files that
### were downloaded from TCGA and to create a sql script to load the
### data in mexpress.
###
### usage:
### Rscript processTCGAcopyNumber.R source full_source_name \
###         path/to/gene/annotation/file path/to/gene/names/file
### The gene annotation file should contain the gene annotation data from UCSC
### in the following format:
### Ensembl ID | HGNC symbol | chr | gene start | gene end | strand
### The gene names file contains a single column with the HGMC symbols
### of the genes for which there is TCGA expression data.
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
dataFile = paste(source, "/tcga_copyNumber_data_", source, ".txt", sep="")

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

# Go through the folders that contain the copy number data and extract
# the values. The copy number data is mapped to chromosomal regions.
# Using gene annotation data from the UCSC genome browser we will
# convert this chromosome region mapping to gene mapping. The
# annotation data we previously extracted from the mage-tab files is
# used to link the copy number data to the corresponding TCGA sample
# barcode.
geneAnn = fread(geneAnnFile, data.table=F)
geneNames = fread(geneNamesFile, data.table=F, header=F)
geneAnn = geneAnn[geneAnn$hgnc_symbol %in% geneNames[,1],]
# Create a list of the gene annotations by splitting the genes up by chromosome.
# This will speed up processing later on.
geneAnnList = list()
uniqueChr = unique(geneAnn$chr)
for (t in 1:length(uniqueChr)){
	geneAnnList[[uniqueChr[t]]] = geneAnn[geneAnn$chr == uniqueChr[t],]
}

print("processing copy number data folders...")
# Find all the files we need to process.
cnDataFiles = vector()
for (t in 1:length(dataFolders)){
	dataFolder = paste(source, "/", dataFolders[t], sep="")
	cnDataFiles = c(cnDataFiles, paste(dataFolder, "/", dir(dataFolder), sep=""))
}
print(paste("processing ", length(cnDataFiles), " copy number data files...", sep=""))
# Get the copy number data.
cnData = lapply(cnDataFiles, function(x, g){	
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
cnDataTable = do.call("cbind", cnData)
cnDataTable = cnDataTable[,c(1, grep("cn", colnames(cnDataTable)))]
# Get the sample names.
cnSamples = sapply(cnDataFiles, function(x, a){
	data = fread(x, data.table=F, nrows=1)
	barcode = a[a$sample == data$Sample[1],]$barcode
	return(barcode)
}, a=allAnn)
# Add the sample names to the CN data.
colnames(cnDataTable)[2:ncol(cnDataTable)] = cnSamples
# Remove rows with only NAs.
cnDataTable = cnDataTable[rowSums(!is.na(cnDataTable[,-1])) != 0,]

# Aggregate the duplicate samples.
colnames(cnDataTable) = sub("-.{3}-.{4}-.{2}$", "", colnames(cnDataTable))
colnames(cnDataTable) = sub("[ABCDEFGHIJKLMNOPQRSTUVWXYZ]$", "", colnames(cnDataTable))
duplicatedSamples = colnames(cnDataTable)[duplicated(colnames(cnDataTable))]
duplicatedSamples = unique(duplicatedSamples)
dup = cnDataTable[,colnames(cnDataTable) %in% duplicatedSamples]
cn = cnDataTable[,!colnames(cnDataTable) %in% duplicatedSamples]
dupResult = matrix(nrow=nrow(dup), ncol=0)
for (t in 1:length(duplicatedSamples)){
	sub = dup[,grep(duplicatedSamples[t], colnames(dup))]
	dupResult = cbind(dupResult, rowMeans(sub))
}
colnames(dupResult) = duplicatedSamples
dupResult = data.frame(dupResult, stringsAsFactors=F)
colnames(dupResult) = gsub("\\.", "-", colnames(dupResult))
cn = cbind(cn, dupResult)
colnames(cn) = gsub("-", "_", colnames(cn))

# Replace the NA values with \N so that MySQL will recognize that
# these values are missing instead of replacing them with 0.
cn[is.na(cn)] = "\\N"

# Build the SQL query.
tableName = paste("copyNumber_", source, sep="")
sqlQuery = paste("DROP TABLE IF EXISTS ", tableName, ";\nCREATE TABLE ", tableName, "(gene_name VARCHAR(15),\n", sep="")
dataInfoQuery = paste("DELETE FROM data_information WHERE source = '", source, "' AND experiment_type = 'copy number' AND technology = 'snp array';\n", sep="")
for (t in 2:ncol(cn)){
	sample = colnames(cn)[t]
	sqlQuery = paste(sqlQuery, paste(sample, " DECIMAL(6,4),\n", sep=""))
	dataInfoQuery = paste(dataInfoQuery, "INSERT INTO data_information (sample_name, data_table, source, full_source_name, experiment_type, technology) VALUES ('", sample, "', '", tableName, "', '", source, "', '", fullSourceName, "', 'copy number', 'snp array');\n", sep="")
}

# Remove the trailing comma from the sql query.
sqlQuery = sub(",\n$", "\n", sqlQuery)

# Add the LOAD DATA statements to the sql query.
if (ncol(cn) >= 999){
	sqlQuery = paste(sqlQuery, ")\nENGINE = MyISAM;\nLOAD DATA LOCAL INFILE '", dataFile, "' INTO TABLE ", tableName, " IGNORE 1 LINES;\nCREATE INDEX gene_name_index ON ", tableName, " (gene_name);", sep="")
} else {
	sqlQuery = paste(sqlQuery, ");\nLOAD DATA LOCAL INFILE '", dataFile, "' INTO TABLE ", tableName, " IGNORE 1 LINES;\nCREATE INDEX gene_name_index ON ", tableName, " (gene_name);", sep="")
}

# Write the sql queries to a file.
cat(sqlQuery, file=paste(source, "/load_", tableName, ".sql", sep=""), sep="")
cat(dataInfoQuery, file=paste(source, "/update_data_information_copyNumber_", source, ".sql", sep=""), sep="")

# Write the result to a file.
write.table(cn, dataFile, col.names=T, row.names=F, quote=F, sep="\t")