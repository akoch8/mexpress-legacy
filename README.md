MEXPRESS
========

### About

[MEXPRESS](http://mexpress.be) is a data visualization tool designed for the easy visualization of [TCGA](https://tcga-data.nci.nih.gov/tcga/) expression, DNA methylation and clinical data, as well as the relationships between them.

This repository contains the back and front-end code to make MEXPRESS run. It also includes the different scripts that are used to download and process the TCGA data that is needed for the tool to work. If you plan to use these scripts, don't forget to update the file `php/connectionVariables.php` with your database parameters!

###Database setup

The `setup` folder contains two SQL scripts you can use to recreate the MEXPRESS database. The file `createDatabase.sql` contains the SQL statements to create the database `mexpress` which contains the table `data_information`. Once you created this database, you can add the different annotation tables (gene, exon and transcript annotation data for example) using the file `annotationTables.sql` (which has been zipped in the `setup` folder). Now that the database is ready, you can use the batch scripts to fill it up with TCGA data.
