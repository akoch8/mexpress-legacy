<?php

require_once("connectionVariables.php");
$connection = mysqli_connect(DB_HOST,DB_USER,DB_PASSWORD,DB_NAME);

$gene = mysqli_real_escape_string($connection,trim($_GET["gene"]));
$sourceString = mysqli_real_escape_string($connection,trim($_GET["source"]));

// check if the query result is already saved or not
// if it is, read the result from the saved file
// if not, run the MySQL query

$savedFileName = $gene.$sourceString;
$savedFileName = str_replace(" ","",$savedFileName);
$savedFileName = getcwd()."/savedQueries/".$savedFileName.".txt";

if (file_exists($savedFileName) && filesize($savedFileName) != 0){
    
    $jsonData = file_get_contents($savedFileName);
    // zip the json object before sending it to the user
    if (function_exists("ob_gzhandler")) ob_start("ob_gzhandler");
    else ob_start();
    echo $jsonData;
    ob_end_flush();
    
} else {
    
    $sourceArray = explode(" ", $sourceString);
    $source = "'".array_shift($sourceArray)."'";
    $fullSourceName = "'".implode(" ", $sourceArray)."'";
    
    # gene & transcript query
    $query = "SELECT * FROM gene_transcript_annotation WHERE hgnc_symbol = '$gene' OR ensembl_id = '$gene';";
    $queryResult = mysqli_query($connection, $query);
    
    if (!$queryResult){
        echo json_encode(mysqli_error());
        mysqli_close($connection);
        die;
    } elseif (mysqli_num_rows($queryResult) == 0){
        $error = array("success" => false, "message" => "Sorry, but there is no transcript data available for <strong>$gene</strong>.", "data" => array());
        echo json_encode($error);
        mysqli_close($connection);
        die;
    }

    $transcripts = array();
    while ($row = mysqli_fetch_assoc($queryResult)){
        $ensembl_id = $row["ensembl_id"];
        $hgnc_symbol = $row["hgnc_symbol"];
        $chromosome = $row["chr"];
        $geneStart = $row["gene_start"];
        $geneEnd = $row["gene_end"];
        $strand = $row["strand"];
        $transcriptName = $row["transcript_id"];
        $transcriptStart = $row["transcript_start"];
        $transcriptEnd = $row["transcript_end"];
        $transcripts[$transcriptName] = array("start" => $transcriptStart, "end" => $transcriptEnd, "exons" => array());
    }
    
    $geneLength = abs($geneStart - $geneEnd);
    if ($geneLength/10 < 1000){
        $extra = 1000;
    } else {
        $extra = $geneLength/10;
    }
    if ($extra > 5000) {
        $extra = 5000;
    }
    $plotStart = $geneStart - $extra;
    $plotEnd = $geneEnd + $extra;
    
    # exon query
    $query = "SELECT * FROM transcript_exon_annotation WHERE ensembl_id = '$ensembl_id' ORDER BY exon_start";
    $queryResult = mysqli_query($connection, $query);
    
    if (!$queryResult){
        echo json_encode(mysqli_error());
        mysqli_close($connection);
        die;
    } elseif (mysqli_num_rows($queryResult) == 0){
        $error = array("success" => false, "message" => "Sorry, but there is no exon data available for <strong>$gene</strong>.", "data" => array());
        echo json_encode($error);
        mysqli_close($connection);
        die;
    }
    
    $exons = array();
    while ($row = mysqli_fetch_assoc($queryResult)){
        $transcript = $row["transcript_id"];
        $exonStart = $row["exon_start"];
        $exonEnd = $row["exon_end"];
        $exonRank = $row["exon_rank"];
        $transcripts[$transcript]["exons"][$exonRank] = array("start" => $exonStart, "end" => $exonEnd);
    }
    
    # cpg islands query
    $query = "SELECT * FROM cpg_islands WHERE chrom='chr$chromosome' AND ((chromStart BETWEEN $plotStart AND $plotEnd) OR (chromEnd BETWEEN $plotStart AND $plotEnd));";
    $queryResult = mysqli_query($connection, $query);
    
    $cpgislands = array();
    if ($queryResult){
        while ($row = mysqli_fetch_assoc($queryResult)){
            $cpgiStart = $row["chromStart"];
            $cpgiEnd = $row["chromEnd"];
            $cpgislands[] = array("start" => $cpgiStart, "end" => $cpgiEnd);
        }
    }

    # methylation probe query
    $platformQuery = "SELECT technology FROM data_information WHERE source = $source AND experiment_type = 'methylation' LIMIT 1";
    $platformQueryResult = mysqli_query($connection, $platformQuery);
    if (!$platformQueryResult){
        echo json_encode(mysqli_error());
        mysqli_close($connection);
        die;
    }
    $row = mysqli_fetch_assoc($platformQueryResult);
    $platform = $row["technology"];
    if ($platform == "infinium 450k"){
        $probeQuery = "SELECT * FROM infinium450k_annotation WHERE infinium450k_annotation.chr = '$chromosome' AND infinium450k_annotation.mapInfo BETWEEN $plotStart AND $plotEnd ORDER BY mapInfo";
    } elseif ($platform == "infinium 27k") {
        $probeQuery = "SELECT * FROM infinium450k_annotation WHERE infinium450k_annotation.methyl27 = 1 AND infinium450k_annotation.chr = '$chromosome' AND infinium450k_annotation.mapInfo BETWEEN $plotStart AND $plotEnd ORDER BY mapInfo";
    }
    $probeQueryResult = mysqli_query($connection, $probeQuery);
    if (!$probeQueryResult){
        echo json_encode(mysqli_error());
        mysqli_close($connection);
        die;
    } elseif (mysqli_num_rows($probeQueryResult) == 0){
        $error = array("success" => false, "message" => "Sorry, but there is no methylation data available for <strong>$gene</strong>.", "data" => array());
        echo json_encode($error);
        mysqli_close($connection);
        die;
    }
    $numerOfProbes = mysqli_num_rows($probeQueryResult);
    # get the probe IDs and annotation
    $probeIds = array();
    $probeAnnotation = array();
    while ($row = mysqli_fetch_assoc($probeQueryResult)){
        $probeId = $row["probeID"];
        $location = $row["mapInfo"];
        $genes = explode(";", $row["genes"]);
        $annotation = explode(";", $row["annotation"]);
        $annResult = array();
        foreach ($genes as $index => $gn){
            if ($gn === $hgnc_symbol){
                array_push($annResult, $annotation[$index]);
            }
        }
        $probeAnnotation[$location] = implode(", ", $annResult);
        $probeIds[$location] = $probeId;
    }
    
    $data = array("success" => true,
                  "message" => "Successfully obtained methylation data.",
                  "geneInfo" => array("ensembl" => $ensembl_id, "hgnc" => $hgnc_symbol, "chr" => $chromosome, "start" => $geneStart, "end" => $geneEnd, "strand" => $strand),
                  "transcripts" => $transcripts,
                  "cpgi" => $cpgislands,
                  "source" => $source,
                  "platform" => $platform,
                  "numberOfProbes" => $numerOfProbes,
                  "probeIds" => $probeIds,
                  "probeAnnotation" => $probeAnnotation,
                  "methylationData" => array(),
                  "expressionData" => array(),
                  "annotation" => array(),
                  "slide" => array(),
                  "pam50" => array());
                  //"batch" => array());
    
    ##
    # methylation data query
    ##
    
    $query = "SELECT * FROM data_information WHERE source = $source AND full_source_name = $fullSourceName AND experiment_type = 'methylation' LIMIT 1";
    $queryResult = mysqli_query($connection, $query);
    
    if (!$queryResult){
        echo json_encode(mysqli_error());
        mysqli_close($connection);
        die;
    } elseif (mysqli_num_rows($queryResult) == 0){
        $error = array("success" => false, "message" => "Sorry, but there is no methylation data available for <strong>$gene</strong>.", "data" => array());
        echo json_encode($error);
        mysqli_close($connection);
        die;
    }
    
    $queryResultRow = mysqli_fetch_array($queryResult);
    $tableName = $queryResultRow["data_table"];
    
    if ($platform == "infinium 450k"){
        $dataQuery = "SELECT infinium450k_annotation.mapInfo, $tableName.* FROM infinium450k_annotation LEFT OUTER JOIN $tableName ON (infinium450k_annotation.id = $tableName.id) WHERE infinium450k_annotation.chr = '$chromosome' AND infinium450k_annotation.mapInfo BETWEEN $plotStart AND $plotEnd ORDER BY infinium450k_annotation.mapInfo";
    } elseif ($platform == "infinium 27k") {
        $dataQuery = "SELECT infinium450k_annotation.mapInfo, $tableName.* FROM infinium450k_annotation LEFT OUTER JOIN $tableName ON (infinium450k_annotation.id = $tableName.id) WHERE infinium450k_annotation.methyl27 = 1 AND infinium450k_annotation.chr = '$chromosome' AND infinium450k_annotation.mapInfo BETWEEN $plotStart AND $plotEnd ORDER BY infinium450k_annotation.mapInfo";
    }
    
    $dataQueryResult = mysqli_query($connection, $dataQuery);
    
    while ($row = mysqli_fetch_assoc($dataQueryResult)){
        
        $location = $row["mapInfo"];
        $methylationData = array_slice($row, 3);
        
        foreach ($methylationData as $key => $value){
            
            if ($value === NULL){
                $data["methylationData"][$key][$location] = "null";
            } else {
                $data["methylationData"][$key][$location] = round($value, 3);
            }
            
        }
        
    }
    
    ##
    # expression data query
    ##
    
    $query = "SELECT * FROM data_information WHERE source = $source AND full_source_name = $fullSourceName AND experiment_type = 'expression' LIMIT 1";
    $queryResult = mysqli_query($connection, $query);
    
    if ($queryResult && mysqli_num_rows($queryResult) != 0){
        
        $queryResultRow = mysqli_fetch_array($queryResult);
        $tableName = $queryResultRow["data_table"];
        
        $dataQuery = "SELECT * FROM $tableName WHERE gene_name = '$hgnc_symbol'";
        
        $dataQueryResult = mysqli_query($connection, $dataQuery);
        
        if (!$dataQueryResult){
            echo json_encode(mysqli_error());
            mysqli_close($connection);
            die;
        } elseif (mysqli_num_rows($dataQueryResult) == 0){
            $error = array("success" => false, "message" => "Sorry, but there is no expression data available for <strong>$gene</strong>.", "data" => array());
            echo json_encode($error);
            mysqli_close($connection);
            die;
        }
        
        $result = mysqli_fetch_assoc($dataQueryResult);
        $result = array_slice($result, 1);
        #arsort($result); # sort the expression data (high to low)
        foreach ($result as $key => $value){
            $data["expressionData"][$key] = round(log($value + 1), 2);
        }
        
    }
    
    ##
    # patient annotation data query
    ##
    
    $sourceUnquoted = str_replace("'", "", $source);
    $sourceUnquoted = strtolower($sourceUnquoted);
    $query = "SELECT * FROM clinical_patient_$sourceUnquoted";
    
    $queryResult = mysqli_query($connection, $query);
    
    if ($queryResult && mysqli_num_rows($queryResult)){
        
        while ($row = mysqli_fetch_assoc($queryResult)){
            
            $patient = $row["patient_barcode"];
            $data["annotation"][$patient] = array();
            unset($row["patient_barcode"]);
            foreach ($row as $key => $value){
                $data["annotation"][$patient][$key] = $value;
            }
            
            $numberOfAnnotationFields = count($row);
            
        }
        
        $data["annotation"]["numberOfAnnotationFields"] = $numberOfAnnotationFields;
        
    } else {
        $data["annotation"] = "no_annotation";
    }
    
    ##
    # sample slide annotation data query
    ##
    
    $query = "SELECT * FROM clinical_sample_$sourceUnquoted";
    
    $queryResult = mysqli_query($connection, $query);
    
    if ($queryResult && mysqli_num_rows($queryResult)){
        
        while ($row = mysqli_fetch_assoc($queryResult)){
            
            $sample = $row["sample"];
            $data["slide"][$sample] = array();
            unset($row["sample"]);
            foreach ($row as $key => $value){
                $data["slide"][$sample][$key] = $value;
            }
            
            $numberOfSlideFields = count($row);
            
        }
        
        $data["slide"]["numberOfSlideFields"] = $numberOfSlideFields;
        
    } else {
        $data["slide"] = "no_data";
    }
    
    ##
    # BRCA sample subtype query
    ##
    
    if ($sourceUnquoted == "brca"){
        
        $query = "SELECT * FROM brca_pam50subtypes";
        
        $queryResult = mysqli_query($connection, $query);
        
        if ($queryResult && mysqli_num_rows($queryResult)){
            
            while ($row = mysqli_fetch_assoc($queryResult)){
                
                $sample = $row["sample"];
                $data["pam50"][$sample] = $row["subtype"];
                
            }
            
        }
        
    }

    ##
    # Batch number query
    ##

    /*$query = "SELECT sample_name, batch FROM data_information WHERE source = $source AND full_source_name = $fullSourceName AND experiment_type = 'expression'";
    
    $queryResult = mysqli_query($connection, $query);
    
    if ($queryResult && mysqli_num_rows($queryResult)){
        
        while ($row = mysqli_fetch_assoc($queryResult)){
            
            $sample = $row['sample_name'];
            $batch = $row['batch'];
            $data['batch'][$sample] = $batch;

        }
        
    } else {
        $data['batch'] = "no_data";
    }*/
    
    ##
    # send the results
    ##
    
    $jsonData = json_encode($data);
    
    // check if there's enough disk space to save the result (10 MB just to be safe)
    if (disk_free_space(getcwd()."/savedQueries/") > 10000000){
        file_put_contents($savedFileName, $jsonData);
        chmod($savedFileName, 0766);
    }
    
    // zip the json object before sending it to the user
    if (function_exists("ob_gzhandler")) ob_start("ob_gzhandler");
    else ob_start();
    echo $jsonData;
    ob_end_flush();
    
}

mysqli_close($connection);

?>