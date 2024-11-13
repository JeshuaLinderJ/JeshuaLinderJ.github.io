# JeshuaLinderJ.github.io

## Donut Website

Website designed to display fun C++ projects


## Project Structure

donut_website/
├── Dockerfile
├── static/
    ├── donut.js
    ├── clock.js
├── donut.html
├── donut.wasm
└── other files...

## Setup Instructions


From the my-emscripten-site directory, run:
    docker build -t emscripten-donut-site .

After building the image, run the container:
    docker run -p 8080:8080 emscripten-donut-site

Open a browser and go to http://localhost:8080 to view the Emscripten-powered spinning donut website running in Docker.


...

## Inspiration

...
