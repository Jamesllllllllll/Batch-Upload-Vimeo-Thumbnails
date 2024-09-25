const fs = require('fs');
const path = require('path');
require('dotenv').config();
const Vimeo = require('vimeo').Vimeo;

const client = new Vimeo(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.ACCESS_TOKEN
);


function getVideos(page = 1, perPage = 50) {
  return new Promise((resolve, reject) => {
    client.request(
      {
        method: 'GET',
        path: '/me/videos',
        query: {
          page: page,
          per_page: perPage,
          fields: 'uri,name',
        },
      },
      (error, body) => {
        if (error) {
          return reject(error);
        }
        resolve(body);
      }
    );
  });
}

function uploadThumbnail(videoUri, imagePath) {
  return new Promise((resolve, reject) => {
    // Step 1: Create a new picture resource
    client.request(
      {
        method: 'POST',
        path: `${videoUri}/pictures`,
      },
      (error, body) => {
        if (error) {
          return reject(error);
        }

        const uploadLink = body.upload_link;
        const pictureUri = body.uri;

        // Step 2: Upload the image file
        fs.readFile(imagePath, (err, fileData) => {
          if (err) {
            return reject(err);
          }

          client.request(
            {
              method: 'PUT',
              url: uploadLink,
              headers: {
                'Content-Type': 'image/jpeg', // Adjust if not JPEG
              },
              body: fileData,
            },
            (uploadError) => {
              if (uploadError) {
                return reject(uploadError);
              }

              // Step 3: Activate the uploaded picture
              client.request(
                {
                  method: 'PATCH',
                  path: pictureUri,
                  query: {
                    active: true,
                  },
                },
                (activateError, activateBody) => {
                  if (activateError) {
                    return reject(activateError);
                  }
                  resolve(activateBody);
                }
              );
            }
          );
        });
      }
    );
  });
}

async function updateThumbnails() {
  try {
    let page = 1;
    let perPage = 50;
    let hasMore = true;

    while (hasMore) {
      const videosResponse = await getVideos(page, perPage);
      const videos = videosResponse.data;

      for (const video of videos) {
        const videoId = video.uri.split('/').pop();

        // Assuming you have images named after the video IDs
        const imagePath = path.join(__dirname, 'thumbnails', `${videoId}.jpg`);

        if (fs.existsSync(imagePath)) {
          console.log(`Updating thumbnail for video ${video.name} (${videoId})...`);

          await uploadThumbnail(video.uri, imagePath);

          console.log(`Thumbnail updated for video ${video.name} (${videoId}).`);
        } else {
          console.log(`No thumbnail found for video ${video.name} (${videoId}).`);
        }
      }

      // Check if there are more pages
      if (videosResponse.paging && videosResponse.paging.next) {
        page += 1;
      } else {
        hasMore = false;
      }
    }
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// updateThumbnails();
