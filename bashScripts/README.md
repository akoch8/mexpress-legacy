MEXPRESS data processing
========================

Run the wrapper script to download the TCGA data for the cancer types in the file `clinicalParameters.txt`. This file must be located in the working directory!
```
nohup ./mexpressTCGAwrapper > nohup_wrapper.out 2>nohup_wrapper.err &
```
The wrapper script calls the script `downloadTGCAdata`. This script downloads all the necessary data and processes this data using the appropriate R scripts. Once the data has been downloaded and processed, the wrapper script calls the upload script `uploadTCGAdata`, which will then upload all the data to the MySQL database.

Don't forget to update the `uploadTCGAdata` script with your database parameters!


