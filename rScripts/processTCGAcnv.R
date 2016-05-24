###
### This script was written to combine CNV data files that were downloaded
### from TCGA and to create a sql script to load the data in mexpress.
###
### usage:
### Rscript processTCGAcnv.R source full_source_name path/to/gene/annotation/file
### The gene annotation file should contain the gene annotation data from UCSC
### in the following format:
### Ensembl ID | HGNC symbol | chr | gene start | gene end | strand
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
geneAnn = geneAnn[order(geneAnn$hgnc_symbol),]
cnv = data.frame(geneAnn$hgnc_symbol, stringsAsFactors=F)
colnames(cnv) = "geneName"
print("processing CNV data folders...")
count = 10
for (t in 1:length(dataFolders)){
	if (t == floor(length(dataFolders)/count)){
		print(paste((11 - count)*10, "%", sep=""))
		count = count - 1
	}
	dataFolder = paste(source, "/", dataFolders[t], sep="")
	dataFiles = dir(dataFolder)
	for (i in 1:length(dataFiles)){
		data = fread(paste(dataFolder, "/", dataFiles[i], sep=""), data.table=F)
		barcode = allAnn[allAnn$sample == data$Sample[1],]$barcode
		cnv[,barcode]= rep(NA, nrow(cnv))
		for (g in 1:nrow(cnv)){
			geneStart = geneAnn$start[g]
			geneEnd = geneAnn$end[g]
			geneChr = geneAnn$chr[g]
			segMean = data[data$Chromosome == geneChr & data$Start <= geneStart & data$End >= geneEnd,]$Segment_Mean
			if (length(segMean) != 0){
				cnv[g,barcode] = segMean
			}
		}
	}
}
#write.table(cnv, paste(source, "/tcga_cnv_data_", source, ".txt", sep=""), col.names=T, row.names=F, quote=F, sep="\t")

#cnv = fread("~/Sites/mexpress_local/data/cnv/tcga_cnv_data_coad.txt", data.table=F)
cnv = unique(cnv)
# Remove rows with only NAs.
cnv = cnv[rowSums(!is.na(cnv[,-1])) != 0,]

# Aggregate the duplicate gene names.
duplicateGenes = cnv$geneName[duplicated(cnv$geneName)]
dup = cnv[cnv$geneName %in% duplicateGenes,]
dup = aggregate(dup[,-1], by=list(dup$geneName), FUN=mean)
colnames(dup)[1] = "geneName"
cnv = cnv[!cnv$geneName %in% duplicateGenes,]
cnv = rbind(cnv, dup)

# Aggregate the duplicate samples.
colnames(cnv) = sub("-.{3}-.{4}-.{2}$", "", colnames(cnv))
colnames(cnv) = sub("[ABCDEFGHIJKLMNOPQRSTUVWXYZ]$", "", colnames(cnv))
duplicatedSamples = colnames(cnv)[duplicated(colnames(cnv))]
duplicatedSamples = unique(duplicatedSamples)
dup = cnv[,colnames(cnv) %in% duplicatedSamples]
cnv = cnv[,!colnames(cnv) %in% duplicatedSamples]
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
	dataInfoQuery = paste(dataInfoQuery, "INSERT INTO data_information (sample_name, data_table, source, full_source_name, experiment_type, technology, batch) VALUES ('", sample, "', '", tableName, "', '", source, "', '", fullSourceName, "', 'cnv', 'snp array');\n", sep="")
}

# Remove the trailing comma from the sql query.
sqlQuery = sub(",\n$", "\n", sqlQuery)

# Add the LOAD DATA statements to the sql query.
if (ncol(cnv) >= 999){
	sqlQuery = paste(sqlQuery, ")\nENGINE = MyISAM;\nLOAD DATA LOCAL INFILE '", dataFile, "' INTO TABLE ", tableName, " IGNORE 1 LINES;\nALTER TABLE ", tableName, " ADD PRIMARY KEY (id);", sep="")
} else {
	sqlQuery = paste(sqlQuery, ");\nLOAD DATA LOCAL INFILE '", dataFile, "' INTO TABLE ", tableName, " IGNORE 1 LINES;\nALTER TABLE ", tableName, " ADD PRIMARY KEY (id);", sep="")
}

# Write the sql queries to a file.
cat(sqlQuery, file=paste(source, "/load_", tableName, ".sql", sep=""), sep="")
cat(dataInfoQuery, file=paste(source, "/update_data_information_methylation_", source, ".sql", sep=""), sep="")

# Write the result to a file.
write.table(cnv, dataFile, col.names=T, row.names=F, quote=F, sep="\t")



