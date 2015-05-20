CREATE DATABASE mexpress;
USE mexpress;
CREATE TABLE data_information (
	id mediumint(9) NOT NULL AUTO_INCREMENT,
	sample_name varchar(255) DEFAULT NULL,
	data_table varchar(255) DEFAULT NULL,
	source varchar(255) DEFAULT NULL,
	full_source_name varchar(255) DEFAULT NULL,
	experiment_type varchar(255) DEFAULT NULL,
	experiment_info varchar(255) DEFAULT NULL,
	technology varchar(255) DEFAULT NULL,
	batch smallint(6) DEFAULT NULL,
	PRIMARY KEY (id)
);
