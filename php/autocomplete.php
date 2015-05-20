<?php

require_once('connectionVariables.php');
$connection = mysqli_connect(DB_HOST,DB_USER,DB_PASSWORD,DB_NAME);

$geneQuery = mysqli_real_escape_string($connection,trim($_GET["query"]));

$result = array("suggestions" => array());

// HGNC symbols
$query = "SELECT hgnc_symbol FROM gene_names WHERE hgnc_symbol = '$geneQuery' OR hgnc_symbol LIKE '$geneQuery%' ORDER BY hgnc_symbol LIMIT 20";
$queryResult = mysqli_query($connection, $query);
if ($queryResult && mysqli_num_rows($queryResult) > 0){
    
    while ($row = mysqli_fetch_assoc($queryResult)){
        $result["suggestions"][] = array("value" => $row["hgnc_symbol"]);
    }
    
}

// Ensembl IDs
$query = "SELECT ensembl_id FROM gene_names WHERE ensembl_id = '$geneQuery' OR ensembl_id LIKE '$geneQuery%' ORDER BY ensembl_id LIMIT 20";
$queryResult = mysqli_query($connection, $query);
if ($queryResult && mysqli_num_rows($queryResult) > 0){
    
    while ($row = mysqli_fetch_assoc($queryResult)){
        $result["suggestions"][] = array("value" => $row["ensembl_id"]);
    }
    
}

// convert to JSON
$jsonResult = json_encode($result);

// zip the json object before sending it to the user
if (function_exists('ob_gzhandler')) ob_start('ob_gzhandler');
else ob_start();
echo $jsonResult;
ob_end_flush();

mysqli_close($connection);

?>