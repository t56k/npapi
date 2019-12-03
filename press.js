#!/usr/bin/env node

/* eslint no-console:0, no-unused-vars:0, no-undef:0 */
// const cloud = 'ddwfsentcju8u'
const cloud = 'dlsauy9pfhfq1'
const host = 'staging.advantplus'

const axios = require('axios')
const express = require('express')
const fs = require('fs')
const fetch = require('node-fetch')
const path = require('path')
const Wordpress = require('wpapi')
const winston = require('winston')
const winstonExRegLogger = require('winston-express-request-logger')
const app = express()

winstonExRegLogger.createLogger({
  transports: [
    new (winston.transports.File)({
      filename: 'press-serve-service.log',
      handleExceptions: true,
      timestamp: true,
      level: 'info'
    }),
    new (winston.transports.Console)({
      handleExceptions: true,
      timestamp: true,
      level: 'info'
    })
  ],
  exitOnError: false
})

app.listen(3000)
app.use(winstonExRegLogger.requestDetails)
app.set('trust proxy', true)
app.get('/adv', (req, res) => {
  res.json({ path: '/adv', status: 'okay' })
})

app.post('/adv/api/v1/posts', (req, res) => {
  http = axios.create({
    baseURL: `https://${host}.com.au/api/v4`,
    headers: { Authorization: `Bearer ${req.body.token}` }
  })

  collectPost(req.body.id)
  res.json({ id: req.body.id, token: req.body.token })
})

const collectPost = (id) => {
  http.get(`/scheduled_posts/${id}`)
    .then(res => res.data.scheduled_post)
    .then(post => {
      console.log(post)

      const api = buildApi(post)
      const local = downloadImg(post.image_path)
      const word = createMedia(api, local, post)
      return word
    })
    .catch(err => console.log(err))
}

const buildApi = (post) => {
  const api = new Wordpress({
    endpoint: `${post.authorisation.page_id}/wp-json`,
    username: post.authorisation.name,
    password: post.authorisation.other_token
  })
  return api
}

const createPost = (api, mediaId, post) => {
  api.posts()
    .create({
      title: post.document.title,
      content: post.document.content,
      excerpt: post.document.excerpt,
      comment_status: 'open',
      status: post.draft ? 'draft' : 'publish',
      featured_media_id: mediaId
    })
    .then(res => res)
    .catch(err => console.log(err))
}

const createMedia = (api, local, post) => {
  api.media().setHeaders('Content-Disposition', 'inline')
    .file(local)
    .create({
      title: `Featured image for ${post.document.title}`
    })
    .then(res => {
      const mediaId = res.id
      createPost(api, mediaId, post)
      return res
    })
    .catch(err => console.log(err))
}

const downloadImg = (remote) => {
  const filepath = `./tmp/${path.basename(remote)}`
  if (fs.existsSync(filepath)) return filepath
  else {
    fetch(`https://${cloud}.cloudfront.net/${remote}`)
      .then(res => {
        const dest = fs.createWriteStream(filepath)
        res.body.pipe(dest)
        return filepath
      })
      .catch(err => console.log(err))
  }
}
