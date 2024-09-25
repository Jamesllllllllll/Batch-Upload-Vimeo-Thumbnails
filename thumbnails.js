import fs from 'fs/promises';
import path from 'path';
import { Vimeo } from 'vimeo';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const client = new Vimeo(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.ACCESS_TOKEN
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function getFolders() {
  return new Promise((resolve, reject) => {
    client.request(
      {
        method: 'GET',
        path: '/me/projects',
      },
      (error, body) => {
        if (error) {
          reject(error);
        } else {
          resolve(body.data);
        }
      }
    );
  });
}

async function getVideosInFolder(folderId) {
  return new Promise((resolve, reject) => {
    client.request(
      {
        method: 'GET',
        path: `/me/projects/${folderId}/videos`,
      },
      (error, body) => {
        if (error) {
          reject(error);
        } else {
          resolve(body.data);
        }
      }
    );
  });
}

async function uploadThumbnail(videoId, thumbnailPath) {
  try {
    const fetch = await import('node-fetch');

    // Step 1: Create a new picture resource
    const pictureResponse = await new Promise((resolve, reject) => {
      client.request(
        {
          method: 'GET',
          path: `/videos/${videoId}?fields=metadata.connections.pictures.uri`,
        },
        (error, body) => {
          if (error) {
            console.error('Error creating picture resource:', error);
            return reject(error);
          }
          resolve(body);
        }
      );
    });

    const uri = pictureResponse.metadata.connections.pictures.uri;

    const uriResponse = await new Promise((resolve, reject) => {
      client.request(
        {
          method: 'POST',
          path: `/${uri}`,
        },
        (error, body) => {
          if (error) {
            console.error('Error getting upload link:', error);
            return reject(error);
          }
          resolve(body);
        }
      );
    });

    const uploadLink = uriResponse.link;
    const thumbnailUri = uriResponse.uri;

    if (!uploadLink) {
      throw new Error(
        'uploadLink is undefined. Check the API response format.'
      );
    }

    // Step 2: Upload the image file
    const fileData = await fs.readFile(thumbnailPath);
    const uploadResponse = await fetch.default(uploadLink, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
      },
      body: fileData,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Failed to upload image. Status: ${uploadResponse.status}`
      );
    }

    console.log('Image uploaded successfully.');

    // Step 4: Activate the new uploaded picture
    await new Promise((resolve, reject) => {
      client.request(
        {
          method: 'PATCH',
          path: `/${thumbnailUri}`,
          'Content-type': 'application/json',
          Accept: 'application/vnd.vimeo.*+json;version=3.4',
          query: {
            active: 'true',
          },
        },
        (error, body) => {
          if (error) {
            console.error('Error activating picture:', error);
            return reject(error);
          }
          resolve(body);
        }
      );
    });

    console.log('Thumbnail activated successfully.');
  } catch (error) {
    console.error('Failed to upload and activate thumbnail:', error);
  }
}

async function updateFolderThumbnails() {
  try {
    const folders = await getFolders();

    console.log('Available folders:');
    folders.forEach((folder, index) => {
      console.log(`${index + 1}. ${folder.name}`);
    });

    const folderIndex =
      parseInt(await question('Enter the number of the folder to update: ')) -
      1;
    const selectedFolder = folders[folderIndex];

    if (!selectedFolder) {
      throw new Error('Invalid folder selection');
    }

    const thumbnailFilename = await question(
      'Enter the thumbnail filename (located in /thumbnails subdirectory): '
    );
    const thumbnailPath = path.join(
      process.cwd(),
      'thumbnails',
      thumbnailFilename
    );

    // Check if thumbnail file exists
    await fs.access(thumbnailPath);

    const videos = await getVideosInFolder(selectedFolder.uri.split('/').pop());

    for (const video of videos) {
      console.log('\n\n----------------------------------------------\n\n');
      console.log(`Updating thumbnail for video: ${video.name}`);
      await uploadThumbnail(video.uri.split('/').pop(), thumbnailPath);
    }
    console.log('\n\n----------------------------------------------\n\n');
    console.log(
      'All videos in the folder have been updated with the new thumbnail.'
    );
  } catch (error) {
    console.error('An error occurred:', error.message);
  } finally {
    rl.close();
  }
}

updateFolderThumbnails();
