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
// Send report by user (Admin only)
router.post('/report-by-user', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { userId } = req.body;
  try {
    // Validate input
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Sanitize email for HTML
    const sanitizedEmail = sanitizeHtml(user.email, {
      allowedTags: [],
      allowedAttributes: {},
    });

    // Fetch responses with populated survey and category
    const responses = await Response.find({ userId })
      .populate({
        path: 'surveyId',
        populate: { path: 'categoryId', select: 'name' },
      });

    if (!responses.length) {
      return res.status(404).json({ message: 'No responses found for this user' });
    }

    // Group responses by category
    const groupedResponses = responses.reduce((acc, response) => {
      if (!response.surveyId || !response.surveyId._id) {
        return acc; // Skip invalid responses
      }
      const categoryName = response.surveyId.categoryId?.name
        ? sanitizeHtml(response.surveyId.categoryId.name)
        : 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = { score: 0, total: 0, responses: [] };
      }
      acc[categoryName].responses.push({
        question: sanitizeHtml(response.surveyId.question || 'N/A'),
        answer: sanitizeHtml(response.answer || 'No answer'),
        correctOption: sanitizeHtml(response.surveyId.correctOption || 'N/A'),
        score: response.score ?? 0,
      });
      acc[categoryName].score += response.score ?? 0;
      acc[categoryName].total += 1;
      return acc;
    }, {});

    // Calculate totals
    const totalScore = Object.values(groupedResponses).reduce((sum, cat) => sum + cat.score, 0);
    const totalPossible = Object.values(groupedResponses).reduce((sum, cat) => sum + cat.total, 0);
    const percentage = totalPossible > 0 ? ((totalScore / totalPossible) * 100).toFixed(2) : 0;

    // Generate HTML content
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
              line-height: 1.6;
            }
            .container {
              max-width: 700px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 12px;
              padding: 24px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 24px;
            }
            .header h1 {
              color: #2563eb;
              font-size: 28px;
              margin: 0;
            }
            .summary-card {
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              padding: 24px;
              margin-bottom: 24px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              animation: fadeIn 1s ease-out;
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
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
              animation: slideIn 0.5s ease-out;
            }
            @keyframes slideIn {
              from { opacity: 0; transform: translateX(-20px); }
              to { opacity: 1; transform: translateX(0); }
            }
            .summary-item.blue { background-color: #dbeafe; }
            .summary-item.green { background-color: #dcfce7; }
            .summary-item.purple { background-color: #f3e8ff; }
            .summary-item .label {
              font-size: 18px;
              color: #374151;
            }
            .summary-item .value {
              font-size: 18px;
              font-weight: 700;
              animation: pulse 1.5s infinite;
            }
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.05); }
              100% { transform: scale(1); }
            }
            .summary-item.blue .value { color: #2563eb; }
            .summary-item.green .value { color: #16a34a; }
            .summary-item.purple .value { color: #9333ea; }
            .category-section {
              margin-bottom: 24px;
              animation: fadeIn 1.5s ease-out;
            }
            .category-section h3 {
              color: #16a34a;
              font-size: 20px;
              margin-bottom: 12px;
            }
            .category-section p {
              font-size: 16px;
              color: #374151;
              margin-bottom: 12px;
            }
            .table-container {
              max-width: 100%;
              overflow-x: auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 12px 0;
              background: #f9fafb;
              min-width: 500px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 12px;
              text-align: left;
              font-size: 14px;
            }
            th {
              background-color: #2563eb;
              color: #ffffff;
              font-weight: bold;
            }
            td {
              background-color: #ffffff;
            }
            tr:nth-child(even) td {
              background-color: #f9fafb;
            }
            .footer {
              text-align: center;
              margin-top: 24px;
              font-size: 12px;
              color: #6b7280;
              padding-top: 16px;
              border-top: 1px solid #e5e7eb;
            }
            .footer a {
              color: #2563eb;
              text-decoration: none;
              transition: color 0.3s ease;
            }
            .footer a:hover {
              color: #1e40af;
            }
            @media (max-width: 600px) {
              .container { padding: 16px; max-width: 100%; }
              .header h1 { font-size: 24px; }
              .summary-card h2 { font-size: 20px; }
              .summary-item .label, .summary-item .value { font-size: 16px; }
              .category-section h3 { font-size: 18px; }
              th, td { font-size: 12px; padding: 8px; }
              table { min-width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Survey Report for ${user.email}</h1>
            </div>
            <div class="summary-card">
              <h2>Your Performance</h2>
              <div class="summary-item blue">
                <span class="label">Gained Marks:</span>
                <span class="value">${totalScore}</span>
              </div>
              <div class="summary-item green">
                <span class="label">Total Marks:</span>
                <span class="value">${totalPossible}</span>
              </div>
              <div class="summary-item purple">
                <span class="label">Percentage:</span>
                <span class="value">${percentage}%</span>
              </div>
            </div>
            <section class="categories">
              ${Object.entries(groupedResponses).map(([category, data]) => `
                <div class="category-section">
                  <h3>${sanitizeHtml(category)}</h3>
                  <p>Score: ${data.score} / ${data.total}</p>
                  <div class="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Question</th>
                          <th>Answer</th>
                          <th>Correct Answer</th>
                          <th>Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${data.responses.map((resp) => `
                          <tr>
                            <td>${resp.question}</td>
                            <td>${resp.answer}</td>
                            <td>${resp.correctOption}</td>
                            <td>${resp.score}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              `).join('')}
            </section>
            <div class="footer">
              <p>Generated by SurveyPro Assessment</p>
              <p><a href="https://surveypro.com">Visit SurveyPro</a> | Contact us at <a href="mailto:support@surveypro.com">support@surveypro.com</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    try {
      await sendEmail(sanitizedEmail, 'Your SurveyPro Report', null, htmlContent);
      res.json({ message: 'Report sent successfully' });
    } catch (emailErr) {
      console.error('Email sending error:', emailErr);
      res.status(500).json({ message: 'Failed to send email' });
    }
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});
module.exports = router;