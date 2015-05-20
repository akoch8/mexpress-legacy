<?php
?>

<html>
<head>
<title>TEST</title>
</head>
<body>


<h1>TESTING FOR IMAGICK</h1>

<?php
if(extension_loaded('imagick')){
    echo "<h2>Imagick loaded</h2>";
} else {
    echo "<h2>Couldn't find Imagick</h2>";
}

phpinfo();

?>

</body>
</html>