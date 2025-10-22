# On-Track - AI-Powered Micro-Learning Platform

## Overview

On-Track is an innovative online learning platform that leverages artificial intelligence to create personalized, bite-sized learning experiences. The platform focuses on micro-learning principles, breaking down complex subjects into manageable competencies and concepts that learners can master at their own pace.

### Key Features

- **AI-Generated Content**: Utilizes OpenAI's GPT models to dynamically generate educational content, questions, and assessments
- **Micro-Learning Approach**: Breaks subjects into competencies and concepts for focused, incremental learning
- **Spaced Repetition**: Implements intelligent review scheduling based on mastery levels
- **Progress Tracking**: Comprehensive tracking of learner progress across subjects, competencies, and concepts
- **Adaptive Learning Paths**: Tracks prerequisites and follow-up competencies to guide learning progression
- **Kanban Board**: Visual organization of learning tasks and progress
- **Multi-Language Support**: Built-in internationalization (i18n) for English and French

### Learning Model

The platform organizes knowledge hierarchically:

1. **Subjects**: High-level topics (e.g., Mathematics, Programming)
2. **Competencies**: Specific skills within a subject, with prerequisites and follow-ups
3. **Concepts**: Individual learning units within competencies
4. **Actions**: Learner interactions tracked for progress and scheduling

### Current Status

⚠️ **This project is a work in progress.** Features are actively being developed and refined.

## Technology Stack

### Frontend
- **Nuxt 3**: Vue.js framework for server-side rendering and static site generation
- **Quasar**: Vue.js component framework for UI components
- **TypeScript**: Type-safe development

### Backend
- **AWS Amplify**: Backend-as-a-service platform
- **AWS Lambda**: Serverless functions for AI processing
- **DynamoDB**: NoSQL database for data storage
- **GraphQL**: API layer for data operations

### AI Integration
- **OpenAI API**: GPT models for content generation
- **Asynchronous Processing**: Lambda-based architecture to handle long-running AI requests without timeouts

## Project Structure

```
on-track/
├── amplify/                    # AWS Amplify backend configuration
│   ├── auth/                   # Authentication resources
│   ├── data/                   # GraphQL schema and data models
│   ├── functions/              # Lambda functions
│   │   └── dynamodb-open-ai-trigger/  # OpenAI integration
│   └── backend.ts              # Backend infrastructure definition
├── components/                 # Vue components
│   ├── competency/             # Competency-related components
│   ├── concept/                # Concept-related components
│   ├── question/               # Question and quiz components
│   └── subject/                # Subject display components
├── composables/                # Vue composables for business logic
│   ├── use-subject.ts          # Subject management
│   ├── use-competency.ts       # Competency operations
│   ├── use-concept.ts          # Concept handling
│   └── use-*.ts                # Various service composables
├── layouts/                    # Application layouts
├── pages/                      # Application pages/routes
│   ├── index.vue               # Dashboard/home page
│   ├── subject/                # Subject pages
│   ├── competency/             # Competency pages
│   ├── concept/                # Concept learning pages
│   ├── subjects/current.vue    # Current subjects overview
│   └── kanban.vue              # Kanban board view
├── plugins/                    # Nuxt plugins
├── public/                     # Static assets
└── server/                     # Server-side code
```

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- AWS Account (for backend deployment)
- OpenAI API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd on-track
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up AWS Amplify**
   ```bash
   npm create amplify@latest
   ```
   Follow the prompts to configure your Amplify project.

4. **Configure environment variables**

   Create a `.env` file in the project root (or configure in Amplify Console):
   ```env
   OPENAI_MODEL=gpt-4o-mini
   OPENAI_MAX_TOKEN=500
   OPENAI_TEMPERATURE=0.7
   ```

5. **Set up OpenAI API Key**

   In the AWS Amplify Console:
   - Navigate to **Hosting** → **Secrets**
   - Create a secret named `OPENAI_API_KEY`
   - Set the value to your OpenAI API key

### Development

1. **Start the development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`

2. **Run the Amplify sandbox (for backend development)**
   ```bash
   npx ampx sandbox
   ```

### Building for Production

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to AWS Amplify**

   The project includes an `amplify.yml` configuration for CI/CD deployment:
   ```bash
   npx ampx pipeline-deploy --branch main --app-id $AWS_APP_ID
   ```

   Or deploy through the Amplify Console by connecting your Git repository.

### Testing

```bash
# Run tests
npm run test

# Generate test coverage
npm run test:coverage
```

## Key Concepts

### Asynchronous AI Processing

The platform uses a unique architecture to handle OpenAI API calls without timeout limitations:

1. **Request Creation**: Frontend creates a request record in DynamoDB
2. **Lambda Trigger**: DynamoDB Stream triggers a Lambda function
3. **AI Processing**: Lambda calls OpenAI API (can run up to 5 minutes)
4. **Response Update**: Lambda updates the DynamoDB record with the response
5. **Frontend Polling**: Frontend polls for completion and displays results

This approach allows for long-running AI operations while keeping the UI responsive.

### Spaced Repetition Algorithm

The platform implements intelligent review scheduling:
- Reviews are scheduled based on the number of previous reviews
- Review intervals increase exponentially: `nextReview = min(10, reviews²) × 12 hours`
- Concepts are marked for revision after completion
- Mastery is achieved after 20 correct answers

### Progress Tracking

The system tracks multiple states for competencies and concepts:

**Competency States:**
- `not_started`: No interaction yet
- `started`: Pre-quiz taken or some concepts in progress
- `ready_for_final`: All concepts mastered or in revision
- `mastered`: Final quiz completed

**Concept States:**
- `not_started`: No interaction yet
- `started`: Learning begun
- `revision`: Completed and scheduled for review
- `mastered`: 20+ correct answers achieved

## User Modes

### Student Mode
- Navigate learning paths
- Complete quizzes and exercises
- Track progress
- Review concepts

### Teacher Mode
- Create and manage subjects
- Generate AI-powered content
- View student progress (future feature)
- Customize learning paths

## Contributing

This is a work-in-progress project. Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Roadmap

- [ ] Enhanced AI content generation
- [ ] Student analytics dashboard
- [ ] Multi-user support with roles
- [ ] Mobile app development
- [ ] Collaborative learning features
- [ ] Content marketplace
- [ ] Advanced spaced repetition algorithms
- [ ] Gamification elements

## License

MIT License, see license.txt

## Acknowledgments

- Built with [Nuxt 3](https://nuxt.com/)
- UI powered by [Quasar Framework](https://quasar.dev/)
- Backend infrastructure by [AWS Amplify](https://aws.amazon.com/amplify/)
- AI capabilities from [OpenAI](https://openai.com/)

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Note**: This project is under active development. Features and documentation are subject to change.
