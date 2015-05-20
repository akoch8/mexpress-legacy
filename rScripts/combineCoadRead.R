###
### This script was written to combine the TCGA COAD and READ data
### files into single files for the new combined cancer type COREAD.
###
### usage:
### Rscript combineCoadRead.R
###
##
#
# Alexander Koch
# 2015
#

library("data.table")

# Combine the expression data.
print("expression")
coad = fread("coad/tcga_rnaseqv2_data_coad.txt", data.table=F)
read = fread("read/tcga_rnaseqv2_data_read.txt", data.table=F)
coread = cbind(coad, read[,-1])
write.table(coread, "coread/tcga_rnaseqv2_data_coread.txt", row.names=F, col.names=T, sep="\t", quote=F)

# Combine the methylation data.
print("methylation")
coad = fread("coad/tcga_humanmethylation450_data_coad.txt", data.table=F)
read = fread("read/tcga_humanmethylation450_data_read.txt", data.table=F)
# Remove the control analyte samples, they can be shared between COAD and READ data
# and will otherwise break the data upload (can't have duplicate columns).
colRemove = grep("_20$", colnames(coad), value=T)
coad = coad[,!colnames(coad) %in% colRemove]
colRemove = grep("_20$", colnames(read), value=T)
read = read[,!colnames(read) %in% colRemove]
coread = cbind(coad, read[,-1])
write.table(coread, "coread/tcga_humanmethylation450_data_coread.txt", row.names=F, col.names=T, sep="\t", quote=F)

# Combine the clinical data.
print("clinical")
coad = fread("coad/tcga_clinicalPatient_data_coad.txt", data.table=F)
read = fread("read/tcga_clinicalPatient_data_read.txt", data.table=F)
coread = rbind(coad, read)
write.table(coread, "coread/tcga_clinicalPatient_data_coread.txt", row.names=F, col.names=T, sep="\t", quote=F)

# Combine the sample slide data.
print("slide")
coad = fread("coad/tcga_sampleSlide_data_coad.txt", data.table=F)
read = fread("read/tcga_sampleSlide_data_read.txt", data.table=F)
coread = rbind(coad, read)
write.table(coread, "coread/tcga_sampleSlide_data_coread.txt", row.names=F, col.names=T, sep="\t", quote=F)
