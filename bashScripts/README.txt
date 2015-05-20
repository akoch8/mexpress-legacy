MEXPRESS data processing

working directory: athos.ugent.be/data2/mexpress/

Run the wrapper script to download the TCGA data for the cancer types in the file clinicalParameters.txt. This file must be located in the working directory (either the actual file or a symbolic link).

nohup ./mexpressTCGAwrapper.0.1 >nohup_wrapper.out 2>nohup_wrapper.err &

The wrapper script calls the download script downloadTGCAdata.0.4. This script downloads all the necessary data and processes this data using the appropriate R scripts. Once the data has been downloaded and processed, the wrapper script calls the upload script uploadTCGAdata.0.1, which will then upload all the data to the MySQL database.


