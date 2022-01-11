const express = require('express')
const bodyParser = require('body-parser')
const { randomBytes } = require('crypto')
const cors = require('cors')
const axios = require('axios')

const app = express()

app.use(bodyParser.json())
app.use(cors())

const commentByPostId = {}

app.get('/posts/:id/comments', (req, res) => {
  res.send(commentByPostId[req.params.id] || [])
})

app.post('/posts/:id/comments', async (req, res) => {
  const commentId = randomBytes(4).toString('hex')
  const { content } = req.body

  // looking up by commentByPostId[req.params.id] to get the list of comments that already exist and associated with the given post, if not an empty array
  const comments = commentByPostId[req.params.id] || []

  comments.push({ id: commentId, content, status: 'pending' })

  // populate new comment to commentByPostId object
  commentByPostId[req.params.id] = comments

  await axios.post('http://localhost:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending'
    }
  })

  res.status(201).send(comments)
})

app.post('/events', async (req, res) => {
  console.log('Event Received: ', req.body.type)

  const { type, data } = req.body

  if (type === 'CommentModerated') {
    const { postId, id, status, content } = data

    const comments = commentByPostId[postId]

    // iterate through the array of comments, and find the comment that we actually want to update matching the id from the event
    const comment = comments.find((comment) => comment.id === id)

    comment.status = status

    await axios.post('http://localhost:4005/events', {
      type: 'CommentUpdated',
      data: {
        id,
        status,
        postId,
        content
      }
    })
  }

  res.send({})
})

app.listen(4001, () => {
  console.log('listening to 4001')
})
