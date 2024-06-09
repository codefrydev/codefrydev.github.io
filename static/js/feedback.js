var comments = document.getElementsByClassName("hapticButton");

function showComment() {
    window.navigator.vibrate(100);
    console.log("hapticButton");
}

for (var i = 0; i < comments.length; i++) {
    comments[i].addEventListener('click', showComment, false);
} 