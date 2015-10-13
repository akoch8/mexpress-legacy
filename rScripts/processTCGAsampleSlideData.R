###
### This script was written to read sample slide data from TCGA
### and to create a sql script to load the data in mexpress.
###
### usage:
### Rscript processTCGAslideData.R source data_directory_name
###
##
#
# Alexander Koch
# 2014
#

# Read the command line arguments that specify the TCGA data source 
args = commandArgs(trailingOnly = T)
# Specify the TCGA data source (eg. skcm).
source = args[1]
dirName = args[2]

# Specify the folder where the data files are stored.
dataDir = paste(source, "/", dirName, sep="")
# Ensure that the specified folder ends with a trailing forward slash.
dataDir = sub("/$", "", dataDir)
dataDir = paste(dataDir, "/", sep="")

fileName = dir(dataDir)
fileName = paste(dataDir, fileName, sep="")
dataFile = paste(source, "/tcga_sampleSlide_data_", source, ".txt", sep="")

tableName = paste("clinical_sample_", source, sep="")
sqlQuery = paste("DROP TABLE IF EXISTS ", tableName, ";\nCREATE TABLE ", tableName, "(\n", sep="")

#print("reading the sample slide data...")
data = read.table(fileName, header=T, sep="\t", stringsAsFactors=F)
data = data[-1,]

# Select the columns of interest.
#data = data[,c("bcr_sample_barcode", "percent_lymphocyte_infiltration", "percent_monocyte_infiltration", "percent_neutrophil_infiltration")]
data = data[,c("bcr_sample_barcode", "percent_lymphocyte_infiltration")]

# Replace missing values with NA for the calculations.
for (t in 2:ncol(data)){
	data[,t] = gsub("\\[Not Available\\]", NA, data[,t])
	data[,t] = gsub("\\[Unknown\\]", NA, data[,t])
	data[,t] = gsub("\\[Not Evaluated\\]", NA, data[,t])
	data[,t] = as.numeric(data[,t])
}
data$bcr_sample_barcode = gsub("[ABCDEFGHIJKLMNOPQRSTUVWXYZ]$", "", data$bcr_sample_barcode)
data$bcr_sample_barcode = gsub("-", "_", data$bcr_sample_barcode)

# Calculate the mean value per sample (there are sometimes multiple slides per sample).
dataAggr = aggregate(data[,2:ncol(data)], by=list(data$bcr_sample_barcode), mean)
#colnames(dataAggr) = c("sample", "lymphocyte_infiltration", "monocyte_infiltration", "neutrophil_infiltration")
colnames(dataAggr) = c("sample", "lymphocyte_infiltration")
dataAggr[,2] = round(dataAggr[,2], digits=2)

# Replace missing values with \\N. This will be interpreted as a missing value by MySQL.
for (t in 2:ncol(data)){
	data[,t] = gsub("\\[Not Available\\]", NA, data[,t])
	data[,t] = gsub("\\[Unknown\\]", NA, data[,t])
	data[,t] = gsub("\\[Not Evaluated\\]", NA, data[,t])
	data[,t] = as.numeric(data[,t])
}

# Creat the SQL script to load the data in mexpress.
tableName = paste("clinical_sample_", source, sep="")
sqlQuery = paste("DROP TABLE IF EXISTS ", tableName, ";\nCREATE TABLE ", tableName, "(\nsample VARCHAR(20),\n", sep="")
for (t in 2:ncol(dataAggr)){
	sqlQuery = paste(sqlQuery, colnames(dataAggr)[t], " DECIMAL(5,2),\n", sep="")
}

# Remove the trailing comma from the sql query.
sqlQuery = sub(",\n$", "\n", sqlQuery)

# Add the LOAD DATA statements to the sql query.
sqlQuery = paste(sqlQuery, ");\nLOAD DATA LOCAL INFILE '", dataFile, "' INTO TABLE ", tableName, " IGNORE 1 LINES;\nCREATE INDEX sample_index ON ", tableName, " (sample);", sep="")

# Write the sql queries to a file.
cat(sqlQuery, file=paste(source, "/load_", tableName, ".sql", sep=""), sep="")

# Write the result to a file.
write.table(dataAggr, dataFile, col.names=T, row.names=F, sep="\t", quote=F)
