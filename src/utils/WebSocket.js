class WebSockets {
    users = []
    unread_chats = []
    connection = (socket) => {
        socket.on('user_connected', data => {
            let userTemp = this.users.filter(i => i.chatId == data.chatId && i.userId == data.user)
            if (userTemp && userTemp.length) {
                let unreadchates = this.unread_chats.filter(i => i.chatId == data.chatId && i.user == data.user)
                if (unreadchates && unreadchates.length) {
                    let index = this.unread_chats.findIndex(i => i.chatId == data.chatId && i.user == data.user)
                    this.unread_chats.splice(index, 1)
                }
                return false
            }
            this.users.push({
                socketId: socket.id,
                chatId: data.chatId,
                userId: data.user
            })
            global.io.emit("user_connected", this.users)
        })
        socket.on('get_unread_messages', data => {
            let index = this.unread_chats.findIndex(i => i.chatId == data.chatId && i.user == data.user)
            if (index != -1) {
                let tmp = [...this.unread_chats]
                tmp[index] = { ...tmp[index], socket: socket.id }
                this.unread_chats = [...tmp]
                global.io.to(socket.id).emit('get_unread_messages', tmp[index].total)
            }else{
                let temp = {
                    chatId: data.chatId,
                    user: data.user,
                    total: 0,
                    socket: socket.id 
                }
                this.unread_chats.push(temp)

            }
        })
        socket.on('message', data => {
            let soc = this.users.filter(i => i.chatId == data.chatId && i.userId == data.reciever)
            if (soc && soc.length) {
                for (let i = 0; i < soc.length; i++) {
                    global.io.to(soc[i].socketId).emit('message', { ...data.data })
                }
            } else {
                let temp = {
                    chatId: data.chatId,
                    user: data.reciever,
                    total: 1
                }
                let unreadchates = this.unread_chats.filter(i => i.chatId == data.chatId && i.user == data.reciever)
                if (unreadchates && unreadchates.length) {
                    let index = this.unread_chats.findIndex(i => i.chatId == data.chatId && i.user == data.reciever)
                    let tmp = [...this.unread_chats]
                    let total = Number(tmp[index].total) + 1
                    tmp[index] = { ...tmp[index], total: total }
                    this.unread_chats = [...tmp]

                    if (index != -1) {
                        global.io.to(this.unread_chats[index].socket).emit('get_unread_messages', this.unread_chats[index].total)
                    }
                } else {
                    this.unread_chats.push(temp)
                    // ..........
                    let index = this.unread_chats.findIndex(i => i.chatId == temp.chatId && i.user == temp.user)
                    if (index != -1) {
                        global.io.to(this.unread_chats[index].socket).emit('get_unread_messages', this.unread_chats[index].total)
                    }
                }
            }
        })

        socket.on('disconnected', data => {
            this.users = this.users.filter((user) => user.socketId !== socket.id);

        })
    }
}

export default new WebSockets();
