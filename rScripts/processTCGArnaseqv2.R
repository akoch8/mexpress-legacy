###
### This script was written to read RNASeqV2 expression data from TCGA,
### to combine the files in a single file
### and to create a sql script to load the data in mexpress.
###
### usage:
### Rscript processTCGArnaseqv2.R source full_source_name data_directory_name
###
##
#
# Alexander Koch
# 2014
#

# Read the command line arguments that specify the TCGA data source 
args = commandArgs(trailingOnly = T)
# Specify the TCGA data source (eg. skcm = skin_cutaneous_melanoma).
source = args[1]
fullSourceName = args[2]
fullSourceName = gsub("_", " ", fullSourceName)
dirName = args[3]

# Specify the folder where the data files are stored.
dataDir = paste(source, "/", dirName, sep="")
# Ensure that the specified folder ends with a trailing forward slash.
dataDir = sub("/$", "", dataDir)
dataDir = paste(dataDir, "/", sep="")

# Go through the data files and add the expression data to a matrix.
# The SQL script to load the data in mexpress is created while going through the different samples.

fileNames = dir(dataDir)
dataFile = paste(source. "/tcga_rnaseqv2_data_", source, ".txt", sep="")

metadata = read.table("metadata.current.txt", header=T, sep="\t", stringsAsFactors=F)
# Reduce the metadata table size by selecting the rows that contain expression data information.
metadata = metadata[grep("RNASeqV2", metadata$DATA_TYPES),]

tableName = paste("expression_", source, sep="")
sqlQuery = paste("DROP TABLE IF EXISTS ", tableName, ";\nCREATE TABLE ", tableName, "(\ngene_name VARCHAR(15),\n", sep="")
dataInfoQuery = paste("DELETE FROM data_information WHERE source = '", source, "' AND experiment_type = 'expression' AND technology = 'RNAseq v2';\n", sep="")

allSamples = vector()

for (t in 1:length(fileNames)){
	
	uuid = fileNames[t]
	uuid = sub("unc\\.edu\\.", "", uuid)
	uuid = sub("\\..+$", "", uuid)
	
	batch = metadata[metadata$UUID == uuid,]$BATCH_NUMBER
	sample = metadata[metadata$UUID == uuid,]$BARCODE
	sample = sub("-.{3}-.{4}-.{2}$", "", sample, perl=T)
	
	if (is.null(sample) | length(sample) == 0){
		next
	}
	
	if (!sample %in% allSamples){
		
		allSamples = c(allSamples, sample)
		# Replace the hyphens in the sample name with underscores (easier for MySQL).
		sample = gsub("-", "_", sample)
		sample = gsub("[ABCDEFGHIJKLMNOPQRSTUVWXYZ]$", "", sample)
		sampleFile = paste(dataDir, fileNames[t], sep="")
		sampleData = read.table(sampleFile, skip=1, header=F, sep="\t", stringsAsFactors=F)
		# Replace the NA values with \N so that MySQL will recognize that these values are missing instead of replacing them with 0.
		sampleData[is.na(sampleData)] = "\\N"
		# Clean up the gene names. Some are like this: x|y or ?|x
		sampleData[,1] = gsub("\\|.+$", "", sampleData[,1])
		sampleData = sampleData[sampleData[,1] != "?",]
		
		if (t == 1){
			data = matrix(nrow=nrow(sampleData), ncol=0)
			rownames(data) = sampleData[,1]
			genes = sampleData[,1]
			numRows = nrow(data)
		}
		
		if (nrow(sampleData) > numRows){
			sampleData = sampleData[sampleData[,1] %in% genes,]
		}
		
		if (!sample %in% colnames(data)){
			data = cbind(data, sampleData[,2])
			colnames(data)[ncol(data)] = sample
			sqlQuery = paste(sqlQuery, paste(sample, " DECIMAL(11,5),\n", sep=""))
			dataInfoQuery = paste(dataInfoQuery, "INSERT INTO data_information (sample_name, data_table, source, full_source_name, experiment_type, technology, batch) VALUES ('", sample, "', '", tableName, "', '", source, "', '", fullSourceName, "', 'expression', 'RNAseq v2', '", batch, "');\n", sep="")
		}
		
	}
	
}

data = as.data.frame(data)

# Remove rows with duplicate rownames.
data = data[!rownames(data) %in% rownames(data)[duplicated(rownames(data))],]

data = cbind(rownames(data), data)
colnames(data)[1] = "geneName"

# Remove the trailing comma from the sql query.
sqlQuery = sub(",\n$", "\n", sqlQuery)

# Add the LOAD DATA statements to the sql query.
if (ncol(data) >= 999){
	sqlQuery = paste(sqlQuery, ")\nENGINE = MyISAM;\nLOAD DATA LOCAL INFILE '", dataFile, "' INTO TABLE ", tableName, " IGNORE 1 LINES;\nCREATE INDEX gene_name_index ON ", tableName, " (gene_name);", sep="")
} else {
	sqlQuery = paste(sqlQuery, ");\nLOAD DATA LOCAL INFILE '", dataFile, "' INTO TABLE ", tableName, " IGNORE 1 LINES;\nCREATE INDEX gene_name_index ON ", tableName, " (gene_name);", sep="")
}

# Write the sql queries to a file.
cat(sqlQuery, file=paste("load_", tableName, ".sql", sep=""), sep="")
cat(dataInfoQuery, file=paste("update_data_information_expression_", source, ".sql", sep=""), sep="")

# Write the result to a file.
write.table(data, dataFile, col.names=T, row.names=F, sep="\t", quote=F)
