MEXPRESS
========

### About

[MEXPRESS](http://mexpress.be) is a data visualization tool designed for the easy visualization of [TCGA](https://tcga-data.nci.nih.gov/tcga/) expression, DNA methylation and clinical data, as well as the relationships between them. It has been published in BMC Genomics: http://www.biomedcentral.com/1471-2164/16/636.

This repository contains the back and front-end code to make MEXPRESS run. It also includes the different scripts that are used to download and process the TCGA data that is needed for the tool to work. I am assuming that you have a functioning web server that includes PHP and MySQL and that you can run bash scripts.

###Database setup

The `setup` folder contains two SQL scripts you can use to recreate the MEXPRESS database. The file `createDatabase.sql` contains the SQL statements to create the database `mexpress` which contains the table `data_information`. Once you created this database, you can add the different annotation tables (gene, exon and transcript annotation data for example) using the file `annotationTables.sql` (which has been zipped in the `setup` folder). Now that the database is ready, you can use the batch scripts to fill it up with TCGA data.

Once you have created a database and before running the batch scripts you must add your own MySQL login details to the `uploadTCGAdata` script. Before you can actually run MEXPRESS, you also have to fill in your database details in the file `php/connectionVariables.php`.
