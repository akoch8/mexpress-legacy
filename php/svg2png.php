<?php

$fileType = $_POST["fileType"];
$gene = $_POST["gene"];
$source = $_POST["source"];
$source = str_replace(" ", "_", $source);
$sorter = $_POST["sorter"];
$sorter = str_replace(" ", "", $sorter);
$probe = $_POST["probe"];
$svgHtml = $_POST["svgHtml"];

// generate the file name
if ($probe != ""){
    $svgFileName = "savedSvgs/".$gene."_".$source."_".$sorter."_".$probe.".svg";
    $pngFileName = "savedSvgs/".$gene."_".$source."_".$sorter."_".$probe.".png";
} else {
    $svgFileName = "savedSvgs/".$gene."_".$source."_".$sorter.".svg";
    $pngFileName = "savedSvgs/".$gene."_".$source."_".$sorter.".png";
}

if (!file_exists($pngFileName) || !file_exists($svgFileName)){
    
    // write the svg image to the svg file
    file_put_contents($svgFileName, $svgHtml);
    chmod($svgFileName, 0766);
    
    // run the inkscape command to convert the svg file to a png image
    exec("inkscape --export-png=".escapeshellarg($pngFileName)." --export-background=white  --export-dpi=300 ".escapeshellarg($svgFileName));
    chmod($pngFileName, 0766);
    
}

if ($fileType == "png"){
    echo "$pngFileName";
} elseif ($fileType == "svg"){
    echo "$svgFileName";
}

?>