###
### This script was written to classify the TCGA breast cancer samples using the PAM50 signature (Parker et al., 2009)
### and to create a sql script to load the data in mexpress.
###
### usage:
### Rscript brcaSubtypes.R
###
##
#
# Alexander Koch
# 2014
#

setwd("Sites/mexpress_TCGA/data")
rm(list=ls())

# Read the command line arguments.
args = commandArgs(trailingOnly = T)
# the first and only argument should contain the name of the file that contains the expression data for the breast cancer samples
dataFile = args[1]
#dataFile = "tcga_rnaseqv2_data_brca_pam50.txt"

# Start by loading the PAM50 data.
# This requires the genefu package, check if it is installed.
if (!"genefu" %in% rownames(installed.packages())){
	source("http://bioconductor.org/biocLite.R")
	biocLite("genefu")
}
suppressPackageStartupMessages(library(genefu))
data(pam50.robust)
# Remove the Normal column from the pam50 centroids.
#pam50.robust$centroids = pam50.robust$centroids[,-5]
# Update some of the pam50 gene names in the pam50 object from the genefu package.
pam50genes = rownames(pam50.robust$centroids)
pam50genes[pam50genes == "KNTC2"] = "NDC80"
pam50genes[pam50genes == "CDCA1"] = "NUF2"
rownames(pam50.robust$centroids) = pam50genes

# Load the expression data.
brca = read.table(dataFile, header=T, sep="\t", stringsAsFactors=F)
rownames(brca) = brca$gene_name
brca = brca[,-1]

# Clustering analysis.
# Remove the normal samples from the data.
removeCols = vector()
for (t in 1:ncol(brca)){
	sample = colnames(brca)[t]
	if (grepl("_11$", sample)){
		removeCols = c(removeCols, sample)
	}
}
brca = brca[,!colnames(brca) %in% removeCols]

library(amap)
hc = hcluster(t(brca), method="pearson", link="average")
grouping = cutree(hc, k=4)
library(sigclust)
for (t in 1:length(unique(grouping))){
	group = unique(grouping)[t]
	testGrouping = grouping
	testGrouping[testGrouping == t] = 1
	testGrouping[testGrouping != t] = 2
	test = sigclust(t(brca), nsim=1000, labflag=1, label=testGrouping, icovest=1)
	print(test@pval)
}

brca[1:10,1:10]
heatmap(t(brca))

brca = log(brca)
medians = apply(brca, 1, median)
brca = t(scale(t(brca), center=medians, scale=F))

brca[1:5,1:10]



#fit = kmeans(brca, 4)
#brcaClust = data.frame(brca, fit$cluster)
#dim(brcaClust)
#str(fit)
#dim(fit$centers)

subTypes = vector()
for (t in 1:ncol(brca)){
	sample = colnames(brca)[t]
	if (grepl("_11$", sample)){
		subTypes[t] = "Normal"
	} else {
		sampleExpression = brca[,t]
		distances = vector()
		for (i in 1:ncol(pam50.robust$centroids)){
			#distances[i] = sum((sampleExpression - pam50.robust$centroids[,i])^2)
			distances[i] = -1*cor(sampleExpression, pam50.robust$centroids[,i], method="spearman", use="pairwise.complete.obs")
		}
		subTypes[t] = colnames(pam50.robust$centroids)[which.min(distances)]
	}
}
pam50subTypes = as.data.frame(cbind(colnames(brca), subTypes))


# Create the SQL query to load the subtypes in the database.
sql = "DROP TABLE IF EXISTS brca_pam50subtypes;\nCREATE TABLE brca_pam50subtypes(\nsample VARCHAR(20),\nsubtype VARCHAR(10)\n);\nLOAD DATA LOCAL INFILE 'tcga_brca_pam50subTypes.txt' INTO TABLE brca_pam50subtypes;\nCREATE INDEX sample_index ON brca_pam50subtypes (sample);"
cat(sql, file="load_pam50subtypes.sql", sep="")
write.table(pam50subTypes, "brca_pam50subTypes.txt", sep="\t", row.names=F, col.names=F, quote=F)






# Test to see whether the results are the same as the TCGA classification
tcga_pam50 = read.table("tcga_breastCancerSubtypes_2columns.txt", header=T, sep="\t", stringsAsFactors=F)
#tcga_pam50$Sample = gsub("-...-....-..$", "", tcga_pam50$Sample)
#tcga_pam50$Sample = gsub("[ABC]$", "", tcga_pam50$Sample)
#tcga_pam50$Sample = gsub("-", "_", tcga_pam50$Sample)
#tcga_pam50 = tcga_pam50[,c("Sample", "PAM50")]
head(tcga_pam50)
#write.table(tcga_pam50, "tcga_pam50_subtypes.txt", quote=F, row.names=F, sep="\t")

colnames(pam50subTypes) = c("sample", "own")
pam50subTypes$tcga = rep(NA, nrow(pam50subTypes))
for (t in 1:nrow(pam50subTypes)){
	if (pam50subTypes$sample[t] %in% tcga_pam50$Sample){
		pam50subTypes$tcga[t] = tcga_pam50[tcga_pam50$Sample == pam50subTypes$sample[t],]$PAM50
	}
}
test = na.omit(pam50subTypes)

nrow(pam50subTypes[which(pam50subTypes$own != pam50subTypes$tcga),])
# They are not... :-(
