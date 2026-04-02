# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

---

# Learning Companion MVP

This frontend allows a student to upload a PDF and then follow along as the
AI reading companion voices the text and asks comprehension questions.

## Local Development

1. Install dependencies (after returning to the workspace root):
   ```bash
   cd frontend
   # make sure you're on React 18, since `react-pdf` only supports up to v18
   # the package.json in this repo has been set accordingly; if you upgraded
   # React previously you'll need to downgrade:
   npm install react@^18.2.0 react-dom@^18.2.0

   npm install
   # install the PDF viewer (peer-deps may warn, use legacy if needed)
   npm install react-pdf @types/react-pdf --legacy-peer-deps
   ```
   *If you hit `ERESOLVE` dependency errors, rerun with `--legacy-peer-deps` or
   switch to Yarn, which is more lenient.*
2. Run `npm start` and open `http://localhost:3000`.
3. Make sure the backend (at port 8000) is running and has CORS enabled.

## Usage

- Navigate to **Documents** via the navbar.
- Upload a PDF file.
- The document will render on the left; the transcript/agent output is shown on
the right.
- When you turn pages, the agent automatically streams its reading and question.
- Voice output is handled by the browser's Web Speech API; ensure your system
sound is active (English is used by default).

> **Note**: `react-pdf` needs a pdf.js worker. The viewer component sets
> `pdfjs.GlobalWorkerOptions.workerSrc` to a CDN copy; if you customise
> the build make sure the worker is available or the console will show
> `Unexpected token '<'` when it tries to fetch an HTML 404 page.

