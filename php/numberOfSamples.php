<?php

require_once("connectionVariables.php");
$connection = mysqli_connect(DB_HOST,DB_USER,DB_PASSWORD,DB_NAME);

$sourceString = mysqli_real_escape_string($connection,trim($_GET["source"]));

$sourceArray = explode(" ", $sourceString);
$source = "'".array_shift($sourceArray)."'";
$fullSourceName = "'".implode(" ", $sourceArray)."'";

// find the samples for which both methylation and expression data is available (these will be found twice in the sample_name column of the data_information table)
$query = "SELECT sample_name, count(sample_name) as c FROM data_information WHERE source IN (".$source.") GROUP BY sample_name HAVING c = 2";

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