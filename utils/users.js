const users = [];
const passwordList = [];
// Join user to chat
function userJoin(id, username, room,pswd) {
  const user = { id, username, room ,pswd};
  // checkPassword(room,pswd);
  users.push(user);

  return user;
}
//check password
function checkPassword(room,pswd,id){
 const room_pass = passwordList.find(el => el.room === room);
 if(!room_pass){
   const room_pass_object = {room,pswd,id};
   passwordList.push(room_pass_object);
   return 1;
 }
 else {
  if(room_pass.pswd === pswd)
  {return 1;}
  else 
  {return 0;}
 }

}

function checkIfPresent(id){
  const presence = passwordList.find(el => el.id === id);
  if(presence){
    return 1;
  }
  else{
    return 0;
  }
}

// Get current user
function getCurrentUser(id) {
  return users.find(user => user.id === id);
}

// User leaves chat
function userLeave(id) {
  // updateUsers(id);
  const index = users.findIndex(user => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}
//update user list
// function updateUsers(id){
//   users = users.filter(user=> id !== user.id);
// }

function removePassword(room){
  const passIndex = passwordList.findIndex(el => el.room === room);
  if(passIndex !== -1){
    passwordList.splice(passIndex,1)[0];
  }
 
}

// Get room users
function getRoomUsers(room) {
  return users.filter(user => user.room === room);
}

module.exports = {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  removePassword,
  checkPassword,
  passwordList,
  checkIfPresent,
  users
};
