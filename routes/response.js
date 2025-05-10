const express = require('express');
const router = express.Router();
const Response = require('../models/Response');
const Survey = require('../models/Survey');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

// Submit a response
router.post('/', authMiddleware, async (req, res) => {
  const { userId, surveyId, answer, score, isReattempt } = req.body;
  try {
    if (!userId || !surveyId || !answer || score == null) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized to submit response for another user' });
    }
    const survey = await Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }
    if (!survey.options.includes(answer)) {
      return res.status(400).json({ message: 'Invalid answer' });
    }
    const existingResponse = await Response.findOne({ userId, surveyId, isReattempt: false });
    if (existingResponse && !isReattempt) {
      return res.status(400).json({ message: 'Response already submitted for this survey' });
    }
    const response = new Response({ userId, surveyId, answer, score, isReattempt });
    await response.save();
    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all responses (Admin only)
router.get('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const responses = await Response.find()
      .populate('userId', 'email role')
      .populate({
        path: 'surveyId',
        populate: { path: 'categoryId', select: 'name' },
      });
    res.json(responses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get my responses (Authenticated user)
router.get('/my-responses', authMiddleware, async (req, res) => {
  try {
    const responses = await Response.find({ userId: req.user._id })
      .populate('userId', 'email')
      .populate({
        path: 'surveyId',
        populate: { path: 'categoryId', select: 'name' },
      });
    res.json(responses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send report by user (Admin only)
router.post('/report-by-user', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { userId } = req.body;
  try {
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const responses = await Response.find({ userId })
      .populate({
        path: 'surveyId',
        populate: { path: 'categoryId', select: 'name' },
      });
    if (!responses.length) {
      return res.status(404).json({ message: 'No responses found for this user' });
    }
    const groupedResponses = responses.reduce((acc, response) => {
      const categoryName = response.surveyId.categoryId?.name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = { score: 0, total: 0, responses: [] };
      }
      acc[categoryName].responses.push({
        question: response.surveyId.question,
        answer: response.answer,
        score: response.score ?? 0,
      });
      acc[categoryName].score += response.score ?? 0;
      acc[categoryName].total += 1;
      return acc;
    }, {});
    const totalScore = Object.values(groupedResponses).reduce((sum, cat) => sum + cat.score, 0);
    const totalPossible = Object.values(groupedResponses).reduce((sum, cat) => sum + cat.total, 0);
    const percentage = totalPossible > 0 ? ((totalScore / totalPossible) * 100).toFixed(2) : 0;
    const htmlContent = `
      <html>
        <head>
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #333;
              background-color: #f4f4f4;
              padding: 20px;
              margin: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 12px;
              padding: 20px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            h1 {
              color: #2563eb;
              text-align: center;
              font-size: 28px;
              margin-bottom: 20px;
            }
            .summary-card {
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              padding: 24px;
              margin-bottom: 24px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .summary-card h2 {
              font-size: 24px;
              font-weight: 800;
              color: #1f2937;
              text-align: center;
              margin-bottom: 24px;
            }
            .summary-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 16px;
              border-radius: 8px;
              margin-bottom: 12px;
            }
            .summary-item.blue {
              background-color: #dbeafe;
            }
            .summary-item.green {
              background-color: #dcfce7;
            }
            .summary-item.purple {
              background-color: #f3e8ff;
            }
            .summary-item .label {
              font-size: 18px;
              color: #374151;
            }
            .summary-item .value {
              font-size: 18px;
              font-weight: 700;
            }
            .summary-item.blue .value {
              color: #2563eb;
            }
            .summary-item.green .value {
              color: #16a34a;
            }
            .summary-item.purple .value {
              color: #9333ea;
            }
            h3 {
              color: #16a34a;
              font-size: 20px;
              margin-top: 20px;
              margin-bottom: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 10px;
              text-align: left;
              font-size: 14px;
            }
            th {
              background-color: #2563eb;
              color: #ffffff;
              font-weight: bold;
            }
            td {
              background-color: #f9fafb;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Survey Report for ${user.email}</h1>
            <div class="summary-card">
              <h2>Your Performance</h2>
              <div class="summary-item blue">
                <span class="label">Gained Marks:</span>
                <span class="value"> ${totalScore}</span>
              </div>
              <div class="summary-item green">
                <span class="label">Total Marks:</span>
                <span class="value"> ${totalPossible}</span>
              </div>
              <div class="summary-item purple">
                <span class="label">Percentage:</span>
                <span class="value"> ${percentage}%</span>
              </div>
            </div>
            ${Object.entries(groupedResponses).map(([category, data]) => `
              <h3>${category}</h3>
              <p>Score: ${data.score} / ${data.total}</p>
              <table>
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Answer</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.responses.map((resp) => `
                    <tr>
                      <td>${resp.question}</td>
                      <td>${resp.answer}</td>
                      <td>${resp.score}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `).join('')}
            <div class="footer">
              <p>Generated by Assement | Thank you for your participation!</p>
            </div>
          </div>
        </body>
      </html>
    `;
    await sendEmail(user.email, 'Your SurveyPro Report', null, htmlContent);
    res.json({ message: 'Report sent successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
module.exports = router;