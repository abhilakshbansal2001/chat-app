const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.querySelectorAll('.room-name');
const userList = document.querySelectorAll('.users');
const ham = document.querySelector('.fa-bars');
const times = document.querySelector('.fa-times');
const modal_container = document.querySelector('.modal-container');
const modal_content = document.querySelector('.modal-content');
// const Cryptr = require('cryptr');
// const cryptr = new Cryptr('myTotalySecretKey');

// Get username and room from URL
// const { username, room } = Qs.parse(location.search, {
//   ignoreQueryPrefix: true
// });

const socket = io();

// Join chatroom
socket.emit('joinRoom');

// Get room and users
socket.on('roomUsers', ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});

// Message from server
socket.on('message', message => {
  console.log(message);
  outputMessage(message);

  // Scroll down
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Message submit
chatForm.addEventListener('submit', e => {
  e.preventDefault();

  // Get message text
  const msg = e.target.elements.msg.value;
  // outputInternalMessage(msg);
  // Emit message to server
  socket.emit('chatMessage', msg);

  // Clear input
  e.target.elements.msg.value = '';
  e.target.elements.msg.focus();
});

socket.on("internalMessage", imsg => {
  outputInternalMessage(imsg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
})

// Output message to DOM
function outputMessage(message) {
  const div = document.createElement('div');
  div.classList.add('message');
  div.innerHTML = `<p class="meta">${message.username} <span>${message.time}</span></p>
  <p class="text">
    ${message.text}
  </p>`;
  document.querySelector('.chat-messages').appendChild(div);
}

function outputInternalMessage(message) {
  const div = document.createElement('div');
  div.classList.add('message-internal');
  div.innerHTML = `<p class="meta">${message.username} <span>${message.time}</span></p>
  <p class="text">
    ${message.text}
  </p>`;
  document.querySelector('.chat-messages').appendChild(div);
}

// Add room name to DOM
function outputRoomName(room) {
  roomName.forEach(el => {
    el.innerText = room;
  })
  
}

// Add users to DOM
function outputUsers(users) {
  userList.forEach(el => {
    el.innerHTML = `
    ${users.map(user => `<li>${user.username}</li>`).join('')}
  `;
  })
}



// event listener
ham.addEventListener('click',()=>{
  modal_container.classList.toggle("show");
  modal_content.classList.toggle("show");
  
})
times.addEventListener('click',()=>{
  modal_container.classList.remove("show");
  modal_content.classList.toggle("show");
})
modal_container.addEventListener('click',(e)=>{
  const target = e.target;
  console.log(target);
  target == modal_container ? times.click() : false;
})