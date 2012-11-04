for i in *.JPG; do
  ujnev=`echo $i | tr [A-Z] [a-z]`
  mv $i $ujnev
done

mkdir .thumb

echo "{\"images\":[" > images.json

for i in *.jpg; do 
    nice -n 10 jpegrotate $i
    nice -n 10 convert $i -resize 200 -quality 70 .thumb/tn_$i
    nice -n 10 convert $i -resize 50% -quality 25 .thumb/qv_$i
    echo "{\"image\": \"$i\", \"thumbnail\": \".thumb/tn_$i\", \"quickview\": \".thumb/qv_$i\"}," >> images.json
    echo $i done...
done

echo "{}]}" >> images.json
