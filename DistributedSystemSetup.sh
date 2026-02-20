#!/bin/bash

echo "--- 1. Updating and Installing System Tools (Git, Pip, SQLite3) ---"
sudo apt update -y
sudo apt install git python3-pip sqlite3 -y

echo "--- 2. Configuring SQLite for Clean Terminal Output ---"

echo ".mode box" > ~/.sqliterc
echo ".header on" >> ~/.sqliterc

echo "--- 3. Cloning Repository ---"

rm -rf Distributed-Marketplace-Project-Python/
git clone https://github.com/saitejapoluka249/Distributed-Marketplace-Project-Python.git

echo "--- 4. Installing Python Dependencies ---"
cd Distributed-Marketplace-Project-Python/
pip3 install flask grpcio grpcio-tools requests zeep spyne lxml --break-system-packages

echo "--- 5. Starting Server: $1 ---"

python3 -m $1