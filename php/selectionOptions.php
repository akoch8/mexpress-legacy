<?php

require_once('connectionVariables.php');
$connection = mysqli_connect(DB_HOST,DB_USER,DB_PASSWORD,DB_NAME);

$sourceString = mysqli_real_escape_string($connection,trim($_GET["source"]));

$sourceArray = explode(' ', $sourceString);
$source = "'".array_shift($sourceArray)."'";
$fullSourceName = "'".implode(" ", $sourceArray)."'";

$query = "SELECT * FROM data_information WHERE source IN (".$source.") AND full_source_name IN (".$fullSourceName.")";

$queryResult = mysqli_query($connection, $query);

if (!$queryResult){
    mysqli_close($connection);
    die;
} elseif (mysqli_num_rows($queryResult) == 0){
    mysqli_close($connection);
    die;
}

$numRows = mysqli_num_rows($queryResult);

$result = array("nrow" => $numRows);

$sampleNames = array();
while ($row = mysqli_fetch_assoc($queryResult)){
    $sampleNames[] = $row["sample_name"];
}

$result["sampleNames"] = array_unique($sampleNames);

echo json_encode($result);

?>