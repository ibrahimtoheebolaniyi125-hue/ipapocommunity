'use strict';

const {
  getStory,
  getUnseenAnonymousStories,
  markAnonymousStorySeen
} = require('./_lib/store');


/* =========================================================
   GET SINGLE STORY
========================================================= */

async function handleStory(req, res) {
  try {
    const storyId = req.query.id;

    if (!storyId) {
      return res.status(400).json({
        success: false,
        error: 'Story ID is required.'
      });
    }

    const story = await getStory(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        error: 'Story not found.'
      });
    }

    return res.status(200).json({
      success: true,
      story
    });

  } catch (error) {
    console.error('Get story error:', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}


/* =========================================================
   GET UNSEEN STORIES
========================================================= */

async function handleUnseen(req, res) {
  try {
    const visitorId =
      req.query.visitorId ||
      req.query.visitor_id;

    if (!visitorId) {
      return res.status(400).json({
        success: false,
        error: 'visitorId is required.'
      });
    }

    const stories =
      await getUnseenAnonymousStories(visitorId);

    console.log(
      `Unseen stories for ${visitorId}: ${stories.length}`
    );

    return res.status(200).json({
      success: true,
      stories
    });

  } catch (error) {
    console.error(
      'Get unseen stories error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}


/* =========================================================
   MARK STORY AS SEEN
========================================================= */

async function handleSeen(req, res) {
  try {
    const body = req.body || {};

    const visitorId =
      body.visitorId ||
      body.visitor_id;

    const storyId =
      body.storyId ||
      body.story_id;

    if (!visitorId || !storyId) {
      return res.status(400).json({
        success: false,
        error:
          'visitorId and storyId are required.'
      });
    }

    await markAnonymousStorySeen(
      visitorId,
      storyId
    );

    console.log(
      `Story ${storyId} marked as seen by ${visitorId}`
    );

    return res.status(200).json({
      success: true
    });

  } catch (error) {
    console.error(
      'Mark story seen error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}


/* =========================================================
   MAIN API HANDLER
========================================================= */

module.exports = async function handler(req, res) {

  const action =
    req.query.action;

  console.log(
    'News API action:',
    action || 'none'
  );


  /* -------------------------------------------------------
     SINGLE STORY
  ------------------------------------------------------- */

  if (action === 'story') {
    return handleStory(req, res);
  }


  /* -------------------------------------------------------
     UNSEEN STORIES
  ------------------------------------------------------- */

  if (action === 'unseen') {
    return handleUnseen(req, res);
  }


  /* -------------------------------------------------------
     MARK STORY AS SEEN
  ------------------------------------------------------- */

  if (action === 'seen') {

    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed.'
      });
    }

    return handleSeen(req, res);
  }


  /* -------------------------------------------------------
     UNKNOWN ACTION
  ------------------------------------------------------- */

  return res.status(404).json({
    success: false,
    error: 'Unknown action.'
  });
};