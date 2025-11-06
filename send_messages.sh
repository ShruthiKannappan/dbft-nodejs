#!/bin/bash

for (( j=0; j<=20; j++ ))
do
  for (( i=0; i<=6; i++ ))
  do
    if [ $i -eq 2 ]; then
      ip="192.168.25.167"
    else
      ip="192.168.25.13"$((i+1))
    fi
    
    port="503"$i
    curl -X POST -H "Content-Type: application/json" -d "{ \"data\": { \"temporary\": \"data$i$j\" } }" http://$ip:$port/transact
  done
done

