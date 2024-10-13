# Batch Update Video Thumbnails in Vimeo

## Purpose

I created this app because I needed to add thumbnails to about 150 videos for a course. The course is divided into modules, each module having 5-25 videos with its own thumbnail.

This app will allow to choose a folder from your Vimeo Library and upload an image as the thumbnail for all the videos in the folder.

## How to Use

0. Copy .env.example to .env, create a Vimeo app and add your credentials
1. Add any thumbnail images you want to use in the /thumbnails folder in this project
2. From the project root folder, run `npm install`
3. Run `node thumbnails.js`
4. Enter the number that represents the folder of your choice
5. Enter the file name of the image you want as the thumbnail
6. Enjoy! The previous active thumbnail will be preserved.

### Note

This app will not remove any previous thumbnails. Running it multiple times on the same folder will add more thumbnails, but only the most recently added will be active.
