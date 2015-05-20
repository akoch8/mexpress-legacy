###
### This script was written to read clinical patient data from TCGA
### and to create a sql script to load the data in mexpress.
###
### usage:
### Rscript processTCGAclinicalPatientData.R source data_directory_name
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
dirName = args[2]

#print(paste("source = ", source, sep=""))
#print(paste("directory = ", dirName, sep=""))

# Specify the folder where the data files are stored.
dataDir = paste(source, "/", dirName, sep="")
# Ensure that the specified folder ends with a trailing forward slash.
dataDir = sub("/$", "", dataDir)
dataDir = paste(dataDir, "/", sep="")

fileName = dir(dataDir)
fileName = paste(dataDir, fileName, sep="")
dataFile = paste("tcga_clinicalPatient_data_", source, ".txt", sep="")

tableName = paste("clinical_patient_", source, sep="")
sqlQuery = paste("DROP TABLE IF EXISTS ", tableName, ";\nCREATE TABLE ", tableName, "(\n", sep="")

#print("reading the clinical patient data...")
clinical = read.table(fileName, skip=1, header=T, sep="\t", stringsAsFactors=F, quote="")
clinical = clinical[-1,]

# Load the file that contains the columns we want to select.
clinicalParameters = read.table("clinicalParameters.txt", header=T, sep="\t", stringsAsFactors=F)
selectedColumns = unlist(strsplit(clinicalParameters[clinicalParameters$tumorType == source,]$clinicalParameters, ","))
selectedColumnsNames = unlist(strsplit(clinicalParameters[clinicalParameters$tumorType == source,]$shortNames, ","))
# Select the desired columns and replace the column names by a shorter version.
clinical = clinical[,selectedColumns]
colnames(clinical) = selectedColumnsNames
clinical$patient_barcode = gsub("-", "_", clinical[,1])

# Replace missing values with \\N. This will be interpreted as a missing value by MySQL.
for (t in 2:ncol(clinical)){
	clinical[,t] = gsub("\\[Not Available\\]", "\\\\N", clinical[,t])
	clinical[,t] = gsub("\\[Unknown\\]", "\\\\N", clinical[,t])
	clinical[,t] = gsub("\\[Not Evaluated\\]", "\\\\N", clinical[,t])
}

# Go through the columns of the data frame with the clinical data.
# Replace the categorical variables with numbers where necessary and build the SQL query to load the data in the MySQL database.
for (t in 1:ncol(clinical)){
	
	colName = colnames(clinical)[t]
	# patient barcode
	if (colName == "patient_barcode"){
		sqlQuery = paste(sqlQuery, colName, " VARCHAR(15),\n", sep="")
	}
	# gender
	else if (colName == "gender"){
		clinical$gender[clinical$gender == "MALE" | clinical$gender == "Male"| clinical$gender == "male"] = 0
		clinical$gender[clinical$gender == "FEMALE" | clinical$gender == "Female" | clinical$gender == "female"] = 1
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# pathologic stage
	else if (colName == "pathologic_stage"){
		clinical$pathologic_stage = gsub("Stage ", "", clinical$pathologic_stage)
		clinical$pathologic_stage[clinical$pathologic_stage == "X" | clinical$pathologic_stage == "Tis"] = 0
		clinical$pathologic_stage[clinical$pathologic_stage == "I" | clinical$pathologic_stage == "IA" | clinical$pathologic_stage == "IB" | clinical$pathologic_stage == "IC" | clinical$pathologic_stage == "IS"] = 1
		clinical$pathologic_stage[clinical$pathologic_stage == "II" | clinical$pathologic_stage == "IIA" | clinical$pathologic_stage == "IIB" | clinical$pathologic_stage == "IIC"] = 2
		clinical$pathologic_stage[clinical$pathologic_stage == "III" | clinical$pathologic_stage == "IIIA" | clinical$pathologic_stage == "IIIB" | clinical$pathologic_stage == "IIIC"] = 3
		clinical$pathologic_stage[clinical$pathologic_stage == "IV" | clinical$pathologic_stage == "IVA" | clinical$pathologic_stage == "IVB" | clinical$pathologic_stage == "IVC"] = 4
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# clinical stage
	else if (colName == "clinical_stage"){
		clinical$clinical_stage = gsub("Stage ", "", clinical$clinical_stage)
		clinical$clinical_stage[clinical$clinical_stage == "X" | clinical$clinical_stage == "Tis"] = 0
		clinical$clinical_stage[clinical$clinical_stage == "I" | grepl("IA.*", clinical$clinical_stage) |  grepl("IB.*", clinical$clinical_stage) | grepl("IC.*", clinical$clinical_stage) | grepl("IS.*", clinical$clinical_stage)] = 1
		clinical$clinical_stage[clinical$clinical_stage == "II" | grepl("IIA.*", clinical$clinical_stage) | grepl("IIB.*", clinical$clinical_stage) | grepl("IIC.*", clinical$clinical_stage)] = 2
		clinical$clinical_stage[clinical$clinical_stage == "III" | grepl("IIIA.*", clinical$clinical_stage) | grepl("IIIB.*", clinical$clinical_stage) | grepl("IIIC.*", clinical$clinical_stage)] = 3
		clinical$clinical_stage[clinical$clinical_stage == "IV" | grepl("IVA.*", clinical$clinical_stage) | grepl("IVB.*", clinical$clinical_stage) | grepl("IVC.*", clinical$clinical_stage)] = 4
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# menopause status
	else if (colName == "menopause_status"){
		clinical$menopause_status = gsub("Indeterminate.+$", 0, clinical$menopause_status)
		clinical$menopause_status = gsub("Pre.+$", 1, clinical$menopause_status)
		clinical$menopause_status = gsub("Peri.+$", 2, clinical$menopause_status)
		clinical$menopause_status = gsub("Post.+$", 3, clinical$menopause_status)
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# estrogen receptor status
	else if (colName == "er_status"){
		clinical$er_status[clinical$er_status == "Negative" | clinical$er_status == "Indeterminate"] = 0
		clinical$er_status[clinical$er_status == "Positive"] = 1
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# progesteron receptor status
	else if (colName == "pr_status"){
		clinical$pr_status[clinical$pr_status == "Negative" | clinical$pr_status == "Indeterminate"] = 0
		clinical$pr_status[clinical$pr_status == "Positive"] = 1
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# HER2 receptor status
	else if (colName == "her2_status"){
		clinical$her2_status[clinical$her2_status == "Negative" | clinical$her2_status == "Indeterminate"] = 0
		clinical$her2_status[clinical$her2_status == "Positive"] = 1
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# tobacco smoking history
	else if (colName == "tobacco_smoking_history"){
		clinical$tobacco_smoking_history[clinical$tobacco_smoking_history == "Lifelong Non-smoker"] = 0
		clinical$tobacco_smoking_history[grepl("Current reformed smoker.+$", clinical$tobacco_smoking_history, ignore.case=T)] = 1
		clinical$tobacco_smoking_history[clinical$tobacco_smoking_history == "Current smoker"] = 2
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# birth control pill usage
	else if (colName == "birth_control_pill_usage"){
		clinical$birth_control_pill_usage[clinical$birth_control_pill_usage == "Never Used"] = 0
		clinical$birth_control_pill_usage[clinical$birth_control_pill_usage == "Former User"] = 1
		clinical$birth_control_pill_usage[clinical$birth_control_pill_usage == "Current User"] = 2
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# history of colon polyps
	else if (colName == "history_of_colon_polyps"){
		clinical$history_of_colon_polyps[clinical$history_of_colon_polyps == "NO" | clinical$history_of_colon_polyps == "No"] = 0
		clinical$history_of_colon_polyps[clinical$history_of_colon_polyps == "YES" | clinical$history_of_colon_polyps == "Yes"] = 1
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# hpv_status by p16 testing
	else if (colName == "hpv_status_p16_testing"){
		clinical$hpv_status_p16_testing[clinical$hpv_status_p16_testing == "Negative"] = 0
		clinical$hpv_status_p16_testing[clinical$hpv_status_p16_testing == "Positive"] = 1
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# cytogenetics risk category
	else if (colName == "cyto_risk_category"){
		clinical$cyto_risk_category[clinical$cyto_risk_category == "Favorable"] = 2
		clinical$cyto_risk_category[clinical$cyto_risk_category == "Intermediate/Normal"] = 1
		clinical$cyto_risk_category[clinical$cyto_risk_category == "Poor"] = 0
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# family history of primary brain tumor
	else if (colName == "family_history_of_brain_tumor"){
		clinical$family_history_of_brain_tumor[clinical$family_history_of_brain_tumor == "NO" | clinical$family_history_of_brain_tumor == "No"] = 0
		clinical$family_history_of_brain_tumor[clinical$family_history_of_brain_tumor == "YES" | clinical$family_history_of_brain_tumor == "Yes"] = 1
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# history of hepatocellular carcinoma risk factor
	else if (colName == "hepato_carcinoma_risk_factor"){
		clinical$hepato_carcinoma_risk_factor[clinical$hepato_carcinoma_risk_factor == "None"] = 0
		clinical$hepato_carcinoma_risk_factor[clinical$hepato_carcinoma_risk_factor != "None" & clinical$hepato_carcinoma_risk_factor != "\\N"] = 1
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# adjacent hepatic tissue inflammation extent
	else if (colName == "hepatic_tissue_inflammation"){
		clinical$hepatic_tissue_inflammation[clinical$hepatic_tissue_inflammation == "None"] = 0
		clinical$hepatic_tissue_inflammation[clinical$hepatic_tissue_inflammation == "Mild"] = 1
		clinical$hepatic_tissue_inflammation[clinical$hepatic_tissue_inflammation == "Severe"] = 2
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# liver fibrosis ishak score
	else if (colName == "liver_fibrosis_ishak_score"){
		clinical$liver_fibrosis_ishak_score = gsub(" - .+$", "", clinical$liver_fibrosis_ishak_score)
		clinical$liver_fibrosis_ishak_score[clinical$liver_fibrosis_ishak_score == "1"] = 1
		clinical$liver_fibrosis_ishak_score[clinical$liver_fibrosis_ishak_score == "1,2"] = 1.5
		clinical$liver_fibrosis_ishak_score[clinical$liver_fibrosis_ishak_score == "3,4"] = 3.5
		clinical$liver_fibrosis_ishak_score[clinical$liver_fibrosis_ishak_score == "5"] = 5
		clinical$liver_fibrosis_ishak_score[clinical$liver_fibrosis_ishak_score == "6"] = 6
		sqlQuery = paste(sqlQuery, colName, " DECIMAL(2,1),\n", sep="")
	}
	# history of diabetes
	else if (colName == "history_of_diabetes"){
		clinical$history_of_diabetes[clinical$history_of_diabetes == "NO" | clinical$history_of_diabetes == "No"] = 0
		clinical$history_of_diabetes[clinical$history_of_diabetes == "YES" | clinical$history_of_diabetes == "Yes"] = 1
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# pregnancies
	else if (colName == "pregnancies"){
		clinical$pregnancies[clinical$pregnancies == "+4"] = 4
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# transform the cea level to log values
	else if (colName == "cea_level"){
		clinical$cea_level[clinical$cea_level != "\\N"] = log(as.numeric(clinical$cea_level[clinical$cea_level != "\\N"]) + 1)
		sqlQuery = paste(sqlQuery, colName, " DECIMAL(5,3),\n", sep="")
	}
	# clark level
	else if (colName == "clark_level"){
		clinical$clark_level[clinical$clark_level == "I"] = 1
		clinical$clark_level[clinical$clark_level == "II"] = 2
		clinical$clark_level[clinical$clark_level == "III"] = 3
		clinical$clark_level[clinical$clark_level == "IV"] = 4
		clinical$clark_level[clinical$clark_level == "V"] = 5
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# Barrett's esophagus
	else if (colName == "barretts_esophagus"){
		clinical$barretts_esophagus[clinical$barretts_esophagus == "No"] = 0
		clinical$barretts_esophagus[clinical$barretts_esophagus == "Yes-UK"] = 1
		clinical$barretts_esophagus[clinical$barretts_esophagus == "Yes-USA"] = 1
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# reflux history
	else if (colName == "reflux_history"){
		clinical$reflux_history[clinical$reflux_history == "NO" | clinical$reflux_history == "No"] = 0
		clinical$reflux_history[clinical$reflux_history == "YES" | clinical$reflux_history == "Yes"] = 1
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# history of asbestos exposure
	else if (colName == "asbestos_exposure"){
		clinical$asbestos_exposure[clinical$asbestos_exposure == "No" | clinical$asbestos_exposure == "NO"] = 0
		clinical$asbestos_exposure[clinical$asbestos_exposure == "Yes" | clinical$asbestos_exposure == "YES"] = 1
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# family history of stomach adenocarcinoma
	else if (colName == "family_history_of_stad"){
		clinical$family_history_of_stad[clinical$family_history_of_stad == "NO" | clinical$family_history_of_stad == "No"] = 0
		clinical$family_history_of_stad[clinical$family_history_of_stad == "YES" | clinical$family_history_of_stad == "Yes"] = 1
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# history of undescended testes
	else if (colName == "history_of_undescended_testis"){
		clinical$history_of_undescended_testis[clinical$history_of_undescended_testis == "No" | clinical$history_of_undescended_testis == "NO"] = 0
		clinical$history_of_undescended_testis[clinical$history_of_undescended_testis == "Yes; bilateral" | clinical$history_of_undescended_testis == "Yes; left testicle only" | clinical$history_of_undescended_testis == "Yes; right testicle only"] = 1
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# family history of testicular cancer
	else if (colName == "family_history_testicular_cancer"){
		clinical$family_history_testicular_cancer[clinical$family_history_testicular_cancer == "NO" | clinical$family_history_testicular_cancer == "No"] = 0
		clinical$family_history_testicular_cancer[clinical$family_history_testicular_cancer == "YES" | clinical$family_history_testicular_cancer == "Yes"] = 1
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# lymphovascular invasion present
	else if (colName == "lymphovascular_invasion"){
		clinical$lymphovascular_invasion[clinical$lymphovascular_invasion == "NO" | clinical$lymphovascular_invasion == "No"] = 0
		clinical$lymphovascular_invasion[clinical$lymphovascular_invasion == "YES" | clinical$lymphovascular_invasion == "Yes"] = 1
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# masaoka stage
	else if (colName == "masaoka_stage"){
		clinical$masaoka_stage[clinical$masaoka_stage == "I"] = 1
		clinical$masaoka_stage[clinical$masaoka_stage == "IIa" | clinical$masaoka_stage == "IIb"] = 2
		clinical$masaoka_stage[clinical$masaoka_stage == "III"] = 3
		clinical$masaoka_stage[clinical$masaoka_stage == "IVa" | clinical$masaoka_stage == "IVb"] = 4
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# history of myasthenia gravis
	else if (colName == "history_myasthenia_gravis"){
		clinical$history_myasthenia_gravis[clinical$history_myasthenia_gravis == "NO" | clinical$history_myasthenia_gravis == "No"] = 0
		clinical$history_myasthenia_gravis[clinical$history_myasthenia_gravis == "YES" | clinical$history_myasthenia_gravis == "Yes"] = 1
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# eye color
	else if (colName == "eye_color"){
		clinical$eye_color[clinical$eye_color == "Blue"] = 1
		clinical$eye_color[clinical$eye_color == "Brown"] = 2
		clinical$eye_color[clinical$eye_color == "Green"] = 3
		sqlQuery = paste(sqlQuery, colName, " TINYINT(4),\n", sep="")
	}
	# no transformation of the data was necessary, still need to add it to the query
	else {
		# check what type of number needs to be added
		number = as.numeric(clinical[,t][clinical[,t] != "\\N"][1])
		if (number %% 1 == 0){
			sqlQuery = paste(sqlQuery, colName, " SMALLINT,\n", sep="")
		} else {
			sqlQuery = paste(sqlQuery, colName, " DECIMAL(6,3),\n", sep="")
		}
	}
	
}

# Remove the trailing comma from the sql query.
sqlQuery = sub(",\n$", "\n", sqlQuery)

# Add the LOAD DATA statements to the sql query.
sqlQuery = paste(sqlQuery, ");\nLOAD DATA LOCAL INFILE '", source, "/", dataFile, "' INTO TABLE ", tableName, " IGNORE 1 LINES;\nCREATE INDEX patient_barcode_index ON ", tableName, " (patient_barcode);", sep="")

# Write the sql queries to a file.
cat(sqlQuery, file=paste("load_", tableName, ".sql", sep=""), sep="")

write.table(clinical, dataFile, sep="\t", col.names=T, row.names=F, quote=F)
