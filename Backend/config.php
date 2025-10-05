<?php

$host = "localhost";
$user = "root";
$pass = "Chrisben@2025";
$db = "Farmdb"

$conn = new mysql($host,$user,$pass,$db);

if(conn -> connect_error) {
    die ("Connection Failed!" .$conn->connect_error);
}