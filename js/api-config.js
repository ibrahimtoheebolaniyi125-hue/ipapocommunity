(function (global) {
    const isLiveServer = ['localhost', '127.0.0.1'].includes(window.location.hostname)
        && window.location.port !== '3000';

    global.ipapoApiUrl = (path) => isLiveServer ? `http://localhost:3000${path}` : path;
})(window);