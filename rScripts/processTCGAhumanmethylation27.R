###
### This script was written to read Infinium 450k data from TCGA,
### to combine them in a single file
### and to create a sql script to load the data in mexpress.
###
### usage:
### Rscript processTCGAmethylation27.R source full_source_name data_directory_name
###
### NOTICE:
### MEXPRESS normally uses the 450k methylation data, but for the ovarian
### samples, most of the methylation data comes from the 27k platform.
### This script processes this 27k data, but is not part of the automated
### processing pipeline. It is run manually for this single use case.
###
###
##
#
# Alexander Koch
# 2014
#

library("data.table")

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

# Go through the file manifest, read the methylation data for every sample and add it to the "data" table.
# The SQL script to load the data in mexpress is created while going through the different samples.

fileNames = dir(dataDir)
fileNames = grep("^jhu-usc", fileNames, value=T)
dataFile = paste(source, "/tcga_humanmethylation27_data_", source, ".txt", sep="")

tableName = paste("methylation_", source, sep="")
sqlQuery = paste("DROP TABLE IF EXISTS ", tableName, ";\nCREATE TABLE ", tableName, "(\nid INT(11),\nprobeID VARCHAR(15),\n", sep="")
dataInfoQuery = paste("DELETE FROM data_information WHERE source = '", source, "' AND experiment_type = 'methylation' AND technology = 'infinium 27k';\n", sep="")

allSamples = vector()

# If it is not the first time that the methylation data is downloaded,
# the data file should already exist and we can add the new data to it.
if(file.exists(dataFile)){
	print("file already exists --> reading it")
	data = fread(dataFile)
	data = as.matrix(data)
	probeIds = data[,"probeID"]
	for (t in 3:ncol(data)){
		sample = colnames(data)[t]
		allSamples = c(allSamples, sample)
		sqlQuery = paste(sqlQuery, paste(sample, " DECIMAL(11,10),\n", sep=""))
		dataInfoQuery = paste(dataInfoQuery, "INSERT INTO data_information (sample_name, data_table, source, full_source_name, experiment_type, technology) VALUES ('", sample, "', '", tableName, "', '", source, "', '", fullSourceName, "', 'methylation', 'infinium 27k');\n", sep="")
	}
}

# Read the file with the probe IDs (must be the same as for the 450k data!).
probeIds = fread("infinium450k_probeIDs.txt", data.table=F)
colnames(probeIds) = c("probeID", "id")

print("reading new data files...")

for (t in 1:length(fileNames)){
	
	barcode = fileNames[t]
	barcode = sub("jhu-usc\\.edu_.+lvl-3\\.", "", barcode)
	barcode = sub("\\..+$", "", barcode)
	
	sample = sub("-.{3}-.{4}-.{2}$", "", barcode, perl=T)
	# Replace the hyphens in the sample name with underscores (easier for MySQL).
	sample = gsub("-", "_", sample)
	sample = gsub("[ABCDEFGHIJKLMNOPQRSTUVWXYZ]$", "", sample)
	
	if (is.null(sample) | length(sample) == 0){
		next
	}
	
	if (!sample %in% allSamples){
		
		allSamples = c(allSamples, sample)
		sampleFile = paste(dataDir, fileNames[t], sep="")
		sampleData = fread(sampleFile, skip=1, colClasses=rep("character", 5), stringsAsFactors=F, data.table=F)
		sampleData = sampleData[,c(1, 2)]
		colnames(sampleData) = c("probeID", "beta")
		# Ensure that the probe IDs are in alphabetical order.
		sampleData = sampleData[order(sampleData$probeID),]
		# Replace the NA values with \N so that MySQL will recognize that these values
		# are missing instead of replacing them with 0.
		sampleData[is.na(sampleData)] = "\\N"
		
		if (t == 1 & !file.exists(dataFile)){
			# Add a column with the probe IDs and one for a numeric probe ID to the data matrix.
			data = merge(sampleData, probeIds)
			data = data[,c("id", "probeID")]
		}

		numRows = nrow(data)
		if (nrow(sampleData) > numRows){
			sampleData = sampleData[sampleData$probeID %in% data$probeID,]
		}
		
		if (!sample %in% colnames(data)){
			data = cbind(data, sampleData$beta)
			colnames(data)[ncol(data)] = sample
			sqlQuery = paste(sqlQuery, paste(sample, " DECIMAL(11,10),\n", sep=""))
			dataInfoQuery = paste(dataInfoQuery, "INSERT INTO data_information (sample_name, data_table, source, full_source_name, experiment_type, technology) VALUES ('", sample, "', '", tableName, "', '", source, "', '", fullSourceName, "', 'methylation', 'infinium 27k');\n", sep="")
		}
		
	}
	
}

# Remove the trailing comma from the sql query.
sqlQuery = sub(",\n$", "\n", sqlQuery)

# Add the LOAD DATA statements to the sql query.
if (ncol(data) >= 999){
	sqlQuery = paste(sqlQuery, ")\nENGINE = MyISAM;\nLOAD DATA LOCAL INFILE '", dataFile, "' INTO TABLE ", tableName, " IGNORE 1 LINES;\nALTER TABLE ", tableName, " ADD PRIMARY KEY (id);", sep="")
} else {
	sqlQuery = paste(sqlQuery, ");\nLOAD DATA LOCAL INFILE '", dataFile, "' INTO TABLE ", tableName, " IGNORE 1 LINES;\nALTER TABLE ", tableName, " ADD PRIMARY KEY (id);", sep="")
}

# Write the sql queries to a file.
cat(sqlQuery, file=paste(source, "/load_", tableName, ".sql", sep=""), sep="")
cat(dataInfoQuery, file=paste(source, "/update_data_information_methylation_", source, ".sql", sep=""), sep="")

# Write the result to a file.
write.table(data, dataFile, col.names=T, row.names=F, sep="\t", quote=F)
