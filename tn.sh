for i in *.JPG *.AVI *.MP4; do
  ujnev=`echo $i | tr [A-Z] [a-z]`
  mv $i $ujnev
done

mkdir .thumb

echo "{\"images\":[" > images.json

# images
for i in *.jpg; do 
    nice -n 10 jpegrotate $i
    nice -n 10 convert $i -resize 200 -quality 70 .thumb/tn_$i
    nice -n 10 convert $i -resize 1000 -quality 25 .thumb/qv_$i
    echo "{\"image\": \"$i\", \"thumbnail\": \".thumb/tn_$i\", \"quickview\": \".thumb/qv_$i\"}," >> images.json
    echo $i done...
done

# videos
for i in *.avi *.mp4; do 
    nice -n 10 ffmpeg -y -i $i -vframes 1 -f image2 .thumb/vid_$i.jpg
    nice -n 10 convert .thumb/vid_$i.jpg -resize 200 -quality 70 .thumb/tn_$i.jpg
    nice -n 10 convert .thumb/vid_$i.jpg -resize 1000 -quality 25 .thumb/qv_$i.jpg
    echo "{\"name\": \"$i\", \"image\": \".thumb/vid_$i.jpg\", \"thumbnail\": \".thumb/tn_$i.jpg\", \"quickview\": \".thumb/qv_$i.jpg\", \"type\": \"video\", \"file\": \"$i\"}," >> images.json
    echo $i done...
done

echo "{}]}" >> images.json
