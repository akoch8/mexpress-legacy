<?php

session_start();

require_once("connectionVariables.php");
$connection = mysqli_connect(DB_HOST,DB_USER,DB_PASSWORD,DB_NAME);

$username = mysqli_real_escape_string($connection,trim($_POST["uname"]));
$password = mysqli_real_escape_string($connection,trim($_POST["pwd"]));

$query = "SELECT user_id, username FROM users WHERE username = '$username' AND password = SHA('$password')";
$result = mysqli_query($connection, $query);

if (mysqli_num_rows($result) == 1) {
    $_SESSION["logged_in"] = true;
    $_SESSION["username"] = $username;
    echo "true";
} else {
    session_destroy();
    echo "false";
}

?>