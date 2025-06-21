# Camcordity

Camcordity is a conversion of the [Screenity](https://github.com/alyssaxuu/screenity/) chrome extension into a regular web application. The goal is to provide in-browser video recording without relying on the chrome extension APIs.

## What is different about Camcordity

* not delivered as a Chrome extension, so cannot use any chrome specific Extension APIs
* delivered instead as a website, but one that has all the video functions running in the browser
* No support for self-hosting
* No support for saving to Google drive

# from the original Screenity README.md (with Camcordity specific notes)

The free and privacy-friendly screen recorder with no limits 🎥

[Get it now - it's free!](https://chrome.google.com/webstore/detail/screenity-screen-recorder/kbbdabhdfibnancpjfhlkhafgdilcnji)

Screenity is a powerful privacy-friendly screen recorder and annotation tool to make better videos for work, education, and more. You can create stunning product demos, tutorials, presentations, or share feedback with your team - all for free.

> You can support this project (and many others) through [GitHub Sponsors](https://github.com/sponsors/alyssaxuu)! ❤️

Made by [Alyssa X](https://alyssax.com)

<a href="https://www.producthunt.com/posts/screenity?utm_source=badge-top-post-badge&utm_medium=badge&utm_souce=badge-screenity" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/top-post-badge.svg?post_id=275308&theme=light&period=daily" alt="Screenity - The most powerful screen recorder for Chrome | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>
<a href="https://news.ycombinator.com/item?id=25150804" target="_blank"><img height=53 src="https://hackerbadge.now.sh/api?id=25150804&type=orange" alt="Featured on HackerNews"></a>

> ❗️ Screenity has been rebuilt from the ground up, and updated to MV3. [Click here](https://help.screenity.io/getting-started/77KizPC8MHVGfpKpqdux9D/what%E2%80%99s-changed-in-the-new-version-of-screenity/bDtvcwAtw9PPesQeNH4zjE) to here to learn more about why, and what's changed in the new version. Also note that **the license has changed to [GPLv3](https://github.com/alyssaxuu/screenity/blob/master/LICENSE)**, but the older MV2 version remains MIT licensed. Make sure you read the license and the [Terms of Service](https://screenity.io/en/terms/) regarding intellectual property.

## Table of contents

- [Features](#features)
- [Self-hosting Camcordity](#self-hosting-camcordity)
- [Creating a development version](#creating-a-development-version)
  - [Enabling Save to Google Drive](#enabling-save-to-google-drive)

## Features

🎥 Make unlimited recordings of your tab, a specific area, desktop, any application, or camera<br>
🎙️ Record your microphone or internal audio, and use features like push to talk<br>
✏️ Annotate by drawing anywhere on the screen, adding text, arrows, shapes, and more<br>
✨ Use AI-powered camera backgrounds or blur to enhance your recordings<br>
🔎 Zoom in smoothly in your recordings to focus on specific areas<br>
🪄 Blur out any sensitive content of any page to keep it private<br>
✂️ Remove or add audio, cut, trim, or crop your recordings with a comprehensive editor<br>
👀 Highlight your clicks and cursor, and go in spotlight mode<br>
⏱️ Set up alarms to automatically stop your recording<br>
💾 Export as mp4, gif, and webm, or save the video directly to Google Drive to share a link<br>
⚙️ Set a countdown, hide parts of the UI, or move it anywhere<br>
🔒 Only you can see your videos, we don’t collect any of your data. You can even go offline!<br>
💙 No limits, make as many videos as you want, for as long as you want<br> …and much more - all for free & no sign in needed!

## Self-hosting Camcordity

Camcordity is not interested in self-hosting (as a chrome extension in developer mode)

## Creating a development version

> ❗️ Note that the license has changed to [GPLv3](https://github.com/alyssaxuu/screenity/blob/master/LICENSE) for the current MV3 version (Screenity version 3.0.0 and higher). Make sure to read the license and the [Terms of Service](https://screenity.io/en/terms/) regarding intellectual property.

1. Check if your [Node.js](https://nodejs.org/) version is >= **14**.
2. Clone this repository.
3. Run `npm install` to install the dependencies.
4. Run `npm start`.
5. Load the extension by going to `chrome://extensions/` , and [enabling developer mode](https://developer.chrome.com/docs/extensions/mv2/faq/#:~:text=You%20can%20start%20by%20turning,a%20packaged%20extension%2C%20and%20more.).
6. Click on `Load unpacked extension`.
7. Select the `build` folder.

### Enabling Save to Google Drive

Camcordity will not support save to google drive. We may add "save to a local server" later.

## Libraries used

- [FFmpeg WASM](https://ffmpegwasm.netlify.app/) for editing and encoding videos
- [Tensorflow](https://github.com/tensorflow/tfjs) with the [Selfie Segmentation](https://blog.tensorflow.org/2022/01/body-segmentation.html) model
- [Fabric.js](https://github.com/fabricjs/fabric.js) for drawing and annotating
- [Radix Primitives](https://www.radix-ui.com/primitives) for the UI components
- [react-color](https://uiwjs.github.io/react-color/) for the color wheel
- [localForage](https://github.com/localForage/localForage) to help store videos offline with IndexedDB
- [Wavesurfer.js](https://wavesurfer.xyz/) to create audio waveforms in the popup and the editor
- [React Advanced Cropper](https://advanced-cropper.github.io/react-advanced-cropper/) for the cropping UI in the editor
- [fix-webm-duration](https://github.com/yusitnikov/fix-webm-duration) to add missing metadata to WEBM files

