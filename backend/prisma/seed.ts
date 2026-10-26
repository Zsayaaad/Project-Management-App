import "dotenv/config";
import { PrismaClient, Role, TaskStatus, TaskPriority } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Resetting database...");
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  console.log("Seeding database...");

  // 1) Hash passwords
  const adminPassword = await bcrypt.hash("Admin123!", 10);
  const memberPassword = await bcrypt.hash("Member123!", 10);

  // 2) Create Admin and Team Members
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@example.com",
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  const member1 = await prisma.user.create({
    data: {
      name: "Alex Johnson",
      email: "member@example.com",
      password: memberPassword,
      role: Role.MEMBER,
    },
  });

  const member2 = await prisma.user.create({
    data: {
      name: "Sarah Smith",
      email: "member2@example.com",
      password: memberPassword,
      role: Role.MEMBER,
    },
  });

  const member3 = await prisma.user.create({
    data: {
      name: "David Chen",
      email: "member3@example.com",
      password: memberPassword,
      role: Role.MEMBER,
    },
  });

  const allUsers = [admin, member1, member2, member3];

  // 3) Define 5 Projects with 25 tasks each
  const projectsData = [
    {
      name: "E-Commerce Mobile App",
      description:
        "Cross-platform mobile application for online retail storefront.",
      tasks: [
        {
          title: "Setup React Native / Expo boilerplate",
          description:
            "Configure navigation, state management, and base theme.",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          dueDays: -5,
          creator: admin,
          assignee: member1,
        },
        {
          title: "Integrate Stripe payment gateway",
          description:
            "Implement checkout flows and webhooks for payment processing.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 2,
          creator: member1,
          assignee: member2,
        },
        {
          title: "Design product catalog UI",
          description: "Build responsive grids and filtering components.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          dueDays: 7,
          creator: admin,
          assignee: member3,
        },
        {
          title: "Implement user authentication & JWT refresh",
          description:
            "Secure login, token rotation, and biometric authentication setup.",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          dueDays: -3,
          creator: admin,
          assignee: member1,
        },
        {
          title: "Push notifications setup with FCM",
          description:
            "Configure Firebase Cloud Messaging for transactional push notifications.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          dueDays: 4,
          creator: member2,
          assignee: member3,
        },
        {
          title: "Product search & auto-complete functionality",
          description:
            "Add instant search index queries with debounce handling.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 6,
          creator: member1,
          assignee: member2,
        },
        {
          title: "Shopping cart state management",
          description:
            "Persist items locally with Zustand and sync with backend on checkout.",
          status: TaskStatus.DONE,
          priority: TaskPriority.MEDIUM,
          dueDays: -1,
          creator: admin,
          assignee: member1,
        },
        {
          title: "User profile & avatar upload service",
          description:
            "Allow updating profile info and cropping avatar image before S3 upload.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 10,
          creator: member3,
          assignee: member3,
        },
        {
          title: "Order history & live tracking view",
          description:
            "Display past orders with status timeline and invoice PDF download.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 3,
          creator: member1,
          assignee: member2,
        },
        {
          title: "Wishlist & favorite items feature",
          description:
            "Add quick favorite toggles on product cards and dedicated wishlist tab.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 12,
          creator: member2,
          assignee: member1,
        },
        {
          title: "Product review & rating system",
          description:
            "User ratings, star breakdown graphs, and photo attachment capability.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          dueDays: 14,
          creator: admin,
          assignee: member3,
        },
        {
          title: "Deep linking for marketing campaigns",
          description:
            "Configure Universal Links (iOS) and App Links (Android) for promo codes.",
          status: TaskStatus.DONE,
          priority: TaskPriority.MEDIUM,
          dueDays: -2,
          creator: member1,
          assignee: member2,
        },
        {
          title: "Dark mode theme switch support",
          description:
            "Implement system accent matching and manual theme switcher.",
          status: TaskStatus.DONE,
          priority: TaskPriority.LOW,
          dueDays: -4,
          creator: member3,
          assignee: member1,
        },
        {
          title: "Optimize image loading & CDN caching",
          description:
            "Integrate WebP image formatting and lazy loading progressive placeholders.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          dueDays: 5,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Apple Pay & Google Pay native integration",
          description:
            "One-click native wallet checkout implementation for mobile devices.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 8,
          creator: member2,
          assignee: member3,
        },
        {
          title: "Multi-currency & localization (i18n)",
          description:
            "Add currency conversion endpoints and support Spanish/French translations.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 15,
          creator: admin,
          assignee: member1,
        },
        {
          title: "Address validation & Google Maps API",
          description: "Address autocomplete for checkout shipping form.",
          status: TaskStatus.DONE,
          priority: TaskPriority.MEDIUM,
          dueDays: -6,
          creator: member1,
          assignee: member3,
        },
        {
          title: "Biometric login (Face ID / Fingerprint)",
          description:
            "Native biometric prompt integration via Expo LocalAuthentication.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 1,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Offline mode cart persistence",
          description:
            "Handle offline queueing for add-to-cart actions when network disconnects.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          dueDays: 9,
          creator: member3,
          assignee: member1,
        },
        {
          title: "In-app support chat widget",
          description:
            "Intercom SDK integration for mobile customer inquiry support.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 11,
          creator: member2,
          assignee: member2,
        },
        {
          title: "Discount code & promo coupon checkout logic",
          description:
            "Backend validation engine for referral and percentage discount codes.",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          dueDays: -7,
          creator: admin,
          assignee: member1,
        },
        {
          title: "Unit & E2E tests for checkout flow",
          description:
            "Write Detox tests covering item search, cart addition, and payment.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 4,
          creator: member1,
          assignee: member3,
        },
        {
          title: "App Store & Play Store asset preparation",
          description:
            "Generate app icons, localized screenshots, and submission metadata.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 18,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Crashlytics & error tracking setup",
          description:
            "Sentry SDK installation for JS & native error monitoring.",
          status: TaskStatus.DONE,
          priority: TaskPriority.MEDIUM,
          dueDays: -8,
          creator: member2,
          assignee: member1,
        },
        {
          title: "Security audit & OWASP mobile compliance",
          description:
            "Perform penetration testing and secure token storage audit.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 20,
          creator: admin,
          assignee: member3,
        },
      ],
    },
    {
      name: "Customer Support Dashboard",
      description:
        "Internal administrative tool for managing support tickets and SLA tracking.",
      tasks: [
        {
          title: "Configure REST API endpoints",
          description: "Expose query endpoints for ticket queues.",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          dueDays: -4,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Implement real-time chat widget",
          description:
            "WebSockets integration for live support agent communication.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 3,
          creator: member2,
          assignee: member1,
        },
        {
          title: "Export ticket analytics to CSV",
          description: "Add data export functionality on reporting page.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 10,
          creator: admin,
          assignee: member3,
        },
        {
          title: "Ticket assignment auto-routing algorithm",
          description:
            "Round-robin distribution of incoming high-priority tickets.",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          dueDays: -6,
          creator: member1,
          assignee: member2,
        },
        {
          title: "SLA tracking timer & breach alerts",
          description:
            "Visual SLA Countdown timer on active tickets and webhook alerts.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 2,
          creator: admin,
          assignee: member1,
        },
        {
          title: "Customer sentiment analysis model",
          description:
            "Classify incoming tickets by urgency and tone using NLP classifier.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          dueDays: 7,
          creator: member3,
          assignee: member3,
        },
        {
          title: "Rich text editor for agent notes",
          description: "Integrate TipTap editor for internal customer notes.",
          status: TaskStatus.DONE,
          priority: TaskPriority.MEDIUM,
          dueDays: -2,
          creator: member2,
          assignee: member2,
        },
        {
          title: "Email-to-ticket conversion service",
          description:
            "Parse incoming customer support emails into structured tickets.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 4,
          creator: admin,
          assignee: member1,
        },
        {
          title: "Knowledge base article search modal",
          description:
            "Allow support agents to insert KB links directly into replies.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 9,
          creator: member1,
          assignee: member3,
        },
        {
          title: "Agent performance & KPI metrics",
          description:
            "Resolution time, tickets closed per hour, and CSAT aggregate graphs.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          dueDays: 11,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Ticket tagging & categorization UI",
          description: "Multi-select tag dropdown and filtered queue views.",
          status: TaskStatus.DONE,
          priority: TaskPriority.LOW,
          dueDays: -5,
          creator: member3,
          assignee: member1,
        },
        {
          title: "Canned responses & macro shortcuts",
          description:
            "Agent shortcut commands to instantly paste common answers.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          dueDays: 5,
          creator: member2,
          assignee: member3,
        },
        {
          title: "Customer CRM history sidebar",
          description:
            "Show previous ticket history, billing status, and plan details.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 8,
          creator: admin,
          assignee: member1,
        },
        {
          title: "Role-based access control (RBAC)",
          description:
            "Permissions for Tier 1, Tier 2, and Admin support managers.",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          dueDays: -3,
          creator: member1,
          assignee: member2,
        },
        {
          title: "Webhook triggers for third-party tools",
          description:
            "Emit events when tickets are opened, updated, or closed.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 14,
          creator: member3,
          assignee: member3,
        },
        {
          title: "Out-of-office auto responder",
          description:
            "Schedule automated responses during holiday or off-hour shifts.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 15,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Merge duplicate tickets tool",
          description:
            "Consolidate multiple emails from the same user into a single ticket.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          dueDays: 1,
          creator: member2,
          assignee: member1,
        },
        {
          title: "Automated CSAT rating email",
          description:
            "Trigger rating request email 1 hour after ticket resolution.",
          status: TaskStatus.DONE,
          priority: TaskPriority.MEDIUM,
          dueDays: -7,
          creator: admin,
          assignee: member3,
        },
        {
          title: "Escalation rules & manager alerts",
          description:
            "Auto-escalate tickets untouched for > 2 hours to tier 2 leads.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 6,
          creator: member1,
          assignee: member2,
        },
        {
          title: "Activity log & audit trails",
          description:
            "Record every field modification, note, and agent reassignment.",
          status: TaskStatus.DONE,
          priority: TaskPriority.LOW,
          dueDays: -1,
          creator: member3,
          assignee: member1,
        },
        {
          title: "Custom dashboard widget layout",
          description:
            "Drag-and-drop dashboard grid for personalized agent metrics.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 16,
          creator: admin,
          assignee: member3,
        },
        {
          title: "Internal agent @mentions in notes",
          description:
            "Notify colleagues in team Slack/Email when tagged in a ticket note.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 3,
          creator: member2,
          assignee: member1,
        },
        {
          title: "Redis queue load monitoring",
          description:
            "Monitor real-time ticket ingestion rate and queue backpressure.",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          dueDays: -8,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Ticket attachments malware scanner",
          description:
            "Scan customer-uploaded files using ClamAV before storing in S3.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          dueDays: 13,
          creator: member1,
          assignee: member3,
        },
        {
          title: "SOC2 compliance & audit log export",
          description:
            "Export audit trails in encrypted archive for compliance verification.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 21,
          creator: admin,
          assignee: member1,
        },
      ],
    },
    {
      name: "AI Assistant Integration",
      description: "Embedding an LLM chatbot into the main SaaS platform.",
      tasks: [
        {
          title: "Evaluate LLM API options & pricing",
          description:
            "Compare latency, cost, and context limits across providers.",
          status: TaskStatus.DONE,
          priority: TaskPriority.MEDIUM,
          dueDays: -5,
          creator: admin,
          assignee: member3,
        },
        {
          title: "Build streaming response UI",
          description: "Render markdown and stream response tokens seamlessly.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 2,
          creator: member3,
          assignee: member1,
        },
        {
          title: "Context window optimization",
          description:
            "Implement vector store semantic search for dynamic context injection.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 6,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Vector database setup (pgvector)",
          description:
            "Initialize PostgreSQL extension for high-performance embeddings.",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          dueDays: -3,
          creator: member1,
          assignee: member2,
        },
        {
          title: "Custom system prompt manager",
          description:
            "Interface to tune system instructions per tenant workspace.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          dueDays: 3,
          creator: admin,
          assignee: member3,
        },
        {
          title: "Document chunking & embedding pipeline",
          description:
            "Background worker to split PDF/DOCX files into 512-token chunks.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 5,
          creator: member2,
          assignee: member1,
        },
        {
          title: "Token usage & cost throttling",
          description:
            "Set daily usage limits per user role to avoid API overruns.",
          status: TaskStatus.DONE,
          priority: TaskPriority.MEDIUM,
          dueDays: -1,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Multi-modal image attachment support",
          description:
            "Allow users to upload screenshots for vision-capable models.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          dueDays: 9,
          creator: member3,
          assignee: member3,
        },
        {
          title: "Chat history persistence & title generator",
          description:
            "Auto-generate conversation titles and store prompt/completion pairs.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 1,
          creator: member1,
          assignee: member1,
        },
        {
          title: "User feedback collector (thumbs up/down)",
          description:
            "Collect prompt feedback to build RLHF / fine-tuning datasets.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 12,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Hallucination & safety guardrails",
          description:
            "Integrate NeMo Guardrails to prevent harmful or off-topic outputs.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 8,
          creator: member2,
          assignee: member3,
        },
        {
          title: "Function calling & tool execution",
          description:
            "Enable AI to execute backend queries (e.g. create task, fetch stats).",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 4,
          creator: admin,
          assignee: member1,
        },
        {
          title: "RAG pipeline latency optimization",
          description:
            "Cache frequent query embeddings in Redis for < 200ms retrieval.",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          dueDays: -2,
          creator: member1,
          assignee: member2,
        },
        {
          title: "Voice input transcription (Whisper API)",
          description:
            "Add microphone record button and auto-transcribe audio queries.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 14,
          creator: member3,
          assignee: member3,
        },
        {
          title: "Text-to-speech response audio playback",
          description: "Stream natural audio output for assistant responses.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 16,
          creator: admin,
          assignee: member2,
        },
        {
          title: "AI API expenditure dashboard",
          description: "Real-time cost visualization breakdown by department.",
          status: TaskStatus.DONE,
          priority: TaskPriority.MEDIUM,
          dueDays: -4,
          creator: member2,
          assignee: member1,
        },
        {
          title: "Model fallback & failover logic",
          description:
            "Automatically route to secondary LLM provider on API outages.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 2,
          creator: admin,
          assignee: member3,
        },
        {
          title: "Domain-specific fine-tuning dataset preparation",
          description: "Format 5,000 JSONL records for domain specialization.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 18,
          creator: member1,
          assignee: member2,
        },
        {
          title: "Multi-language assistant responses",
          description: "Force language response matching user locale header.",
          status: TaskStatus.DONE,
          priority: TaskPriority.LOW,
          dueDays: -6,
          creator: member3,
          assignee: member1,
        },
        {
          title: "Code block syntax highlighting & copy button",
          description:
            "Format generated code snippets with Monaco editor theme.",
          status: TaskStatus.DONE,
          priority: TaskPriority.MEDIUM,
          dueDays: -7,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Citation & source reference UI",
          description:
            "Render clickable reference badges pointing to source docs.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          dueDays: 5,
          creator: member2,
          assignee: member3,
        },
        {
          title: "Prompt injection defense filter",
          description:
            "Sanitize incoming prompt strings against jailbreak patterns.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 10,
          creator: admin,
          assignee: member1,
        },
        {
          title: "Agentic workflow orchestrator",
          description:
            "Multi-step reasoning planner for complex user requests.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 13,
          creator: member1,
          assignee: member2,
        },
        {
          title: "PII masking before LLM submission",
          description:
            "Redact email addresses, phone numbers, and SSNs from prompts.",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          dueDays: -9,
          creator: member3,
          assignee: member3,
        },
        {
          title: "E2E benchmark evaluation suite",
          description:
            "Automated scoring of AI accuracy on standard test questions.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          dueDays: 22,
          creator: admin,
          assignee: member1,
        },
      ],
    },
    {
      name: "Cloud Infrastructure Migration",
      description:
        "Migrating legacy servers to containerized AWS infrastructure.",
      tasks: [
        {
          title: "Write Dockerfiles for Node backend",
          description: "Optimize multi-stage builds for minimal image size.",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          dueDays: 0,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Configure Terraform scripts",
          description: "Provision VPC, ECS, and PostgreSQL RDS instances.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 5,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Setup CI/CD pipeline",
          description:
            "Automate build, test, and deploy steps in GitHub Actions.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          dueDays: 8,
          creator: member1,
          assignee: member3,
        },
        {
          title: "Provision PostgreSQL RDS with read replicas",
          description:
            "Setup multi-AZ deployment with automated daily backups.",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          dueDays: -5,
          creator: admin,
          assignee: member1,
        },
        {
          title: "Redis Cluster setup for session caching",
          description:
            "Deploy ElastiCache Redis cluster with automatic failover.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 2,
          creator: member2,
          assignee: member2,
        },
        {
          title: "AWS VPC subnets & NAT Gateway setup",
          description:
            "Configure isolated private subnets and secure internet egress.",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          dueDays: -7,
          creator: member1,
          assignee: member3,
        },
        {
          title: "Kubernetes / ECS service deployment",
          description:
            "Write task definitions and auto-scaling group policies.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 3,
          creator: admin,
          assignee: member2,
        },
        {
          title: "CloudFront CDN asset distribution",
          description:
            "Cache static uploads and frontend assets at edge locations.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          dueDays: 7,
          creator: member3,
          assignee: member1,
        },
        {
          title: "SSL/TLS certificate automation (ACM)",
          description:
            "Request and attach wildcard SSL certs to Application Load Balancer.",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          dueDays: -2,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Prometheus & Grafana monitoring",
          description:
            "Build infrastructure metrics dashboard and CPU spike alerts.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          dueDays: 4,
          creator: member1,
          assignee: member3,
        },
        {
          title: "Datadog APM & log aggregation",
          description: "Ship container logs and distributed trace samples.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 10,
          creator: member2,
          assignee: member1,
        },
        {
          title: "Auto-scaling rules configuration",
          description:
            "Scale ECS task count based on target 70% CPU usage threshold.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          dueDays: 11,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Zero-downtime database migration plan",
          description: "Test dual-write replication during cutover window.",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          dueDays: -4,
          creator: member1,
          assignee: member1,
        },
        {
          title: "IAM roles & least-privilege policy audit",
          description:
            "Restrict IAM permissions for microservices access to S3/KMS.",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          dueDays: -8,
          creator: admin,
          assignee: member3,
        },
        {
          title: "AWS WAF rules setup",
          description:
            "Enable rate limiting rules and SQL injection blocking firewall.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 1,
          creator: member2,
          assignee: member2,
        },
        {
          title: "Disaster recovery & cross-region backup",
          description: "Configure nightly S3 bucket cross-region replication.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          dueDays: 12,
          creator: member3,
          assignee: member1,
        },
        {
          title: "Bastion host / Teleport SSH setup",
          description:
            "Secure production database access via zero-trust proxy.",
          status: TaskStatus.DONE,
          priority: TaskPriority.MEDIUM,
          dueDays: -1,
          creator: admin,
          assignee: member2,
        },
        {
          title: "AWS Secrets Manager integration",
          description:
            "Migrate environment variables into encrypted Secrets Manager secrets.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 6,
          creator: member1,
          assignee: member3,
        },
        {
          title: "DNS migration & Route53 failover",
          description:
            "Prepare low TTL DNS records for smooth domain migration.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 14,
          creator: admin,
          assignee: member1,
        },
        {
          title: "Internal microservices service mesh",
          description:
            "Implement Envoy sidecars for mTLS inter-service encryption.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 15,
          creator: member2,
          assignee: member2,
        },
        {
          title: "AWS Savings Plans & cost optimization",
          description:
            "Analyze compute usage and purchase compute savings plans.",
          status: TaskStatus.DONE,
          priority: TaskPriority.LOW,
          dueDays: -3,
          creator: admin,
          assignee: member3,
        },
        {
          title: "Container vulnerability scan (Trivy)",
          description:
            "Add automated container image CVE scanning in pipeline.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 3,
          creator: member1,
          assignee: member1,
        },
        {
          title: "k6 load testing & capacity benchmark",
          description:
            "Simulate 10,000 concurrent user requests to find bottlenecks.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          dueDays: 9,
          creator: member3,
          assignee: member2,
        },
        {
          title: "Failover testing & chaos engineering drill",
          description:
            "Simulate database primary node crash and observe auto-failover.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 17,
          creator: admin,
          assignee: member3,
        },
        {
          title: "Final cloud compliance audit",
          description:
            "Ensure infrastructure meets PCI-DSS & SOC2 security standards.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 23,
          creator: admin,
          assignee: member1,
        },
      ],
    },
    {
      name: "Marketing Landing Page Redesign",
      description:
        "Conversion-focused landing page overhaul with modern frontend tech.",
      tasks: [
        {
          title: "Figma design system handoff",
          description:
            "Review hero section and CTA components with UI designer.",
          status: TaskStatus.DONE,
          priority: TaskPriority.LOW,
          dueDays: -4,
          creator: admin,
          assignee: member1,
        },
        {
          title: "Implement Next.js static pages",
          description: "Build fast, SEO-friendly landing pages.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          dueDays: 3,
          creator: member1,
          assignee: member1,
        },
        {
          title: "Configure analytics & funnel tracking",
          description: "Track button clicks and user conversion flow.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 9,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Hero section interactive 3D component",
          description: "Integrate Spline 3D interactive hero animation.",
          status: TaskStatus.DONE,
          priority: TaskPriority.MEDIUM,
          dueDays: -2,
          creator: member2,
          assignee: member3,
        },
        {
          title: "Customer testimonials video carousel",
          description: "Build smooth carousel displaying video testimonials.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.LOW,
          dueDays: 2,
          creator: admin,
          assignee: member1,
        },
        {
          title: "Interactive pricing tier calculator",
          description: "Dynamic pricing sliders based on user seat count.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 5,
          creator: member1,
          assignee: member2,
        },
        {
          title: "Newsletter subscription webhook integration",
          description: "Connect footer sign-up form with ConvertKit API.",
          status: TaskStatus.DONE,
          priority: TaskPriority.LOW,
          dueDays: -6,
          creator: member3,
          assignee: member3,
        },
        {
          title: "Lead magnet eBook download modal",
          description:
            "Capture emails in exchange for whitepaper PDF download.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          dueDays: 4,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Dynamic OpenGraph preview card generator",
          description:
            "Generate dynamic social sharing thumbnail images for blog posts.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          dueDays: 8,
          creator: member2,
          assignee: member1,
        },
        {
          title: "Core Web Vitals performance tuning",
          description: "Optimize LCP and eliminate layout shifts (CLS < 0.05).",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          dueDays: -1,
          creator: admin,
          assignee: member3,
        },
        {
          title: "A/B testing framework integration",
          description:
            "Setup PostHog feature flags for hero CTA copy experiments.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDays: 1,
          creator: member1,
          assignee: member2,
        },
        {
          title: "Cross-browser & mobile responsive audit",
          description:
            "Test layout rendering on Safari, Chrome, iOS, and Android.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 6,
          creator: member3,
          assignee: member1,
        },
        {
          title: "Cookie consent & GDPR compliance banner",
          description: "Custom cookie consent popup storing user preferences.",
          status: TaskStatus.DONE,
          priority: TaskPriority.MEDIUM,
          dueDays: -5,
          creator: admin,
          assignee: member2,
        },
        {
          title: "Interactive feature matrix table",
          description:
            "Comparison table detailing features across Free, Pro, and Enterprise.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          dueDays: 7,
          creator: member2,
          assignee: member3,
        },
        {
          title: "Multi-language i18n support",
          description:
            "Add localization for English, Spanish, and German locales.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDays: 11,
          creator: admin,
          assignee: member1,
        },
        {
          title: "Light & dark theme toggle component",
          description:
            "Smooth CSS variable transition between light and dark modes.",
          status: TaskStatus.DONE,
          priority: TaskPriority.LOW,
          dueDays: -3,
          creator: member1,
          assignee: member2,
        },
        {
          title: "Live sales chat widget setup",
          description:
            "Integrate HubSpot chat widget for sales team engagement.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          dueDays: 10,
          creator: member3,
          assignee: member3,
        },
        {
          title: "Schema.org structured data injection",
          description:
            "Add Organization and Product JSON-LD schemas for Google indexing.",
          status: TaskStatus.DONE,
          priority: TaskPriority.LOW,
          dueDays: -7,
          creator: admin,
          assignee: member1,
        },
        {
          title: "Scroll-triggered Framer Motion animations",
          description:
            "Add subtle scroll reveal animations to key value proposition sections.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          dueDays: 3,
          creator: member2,
          assignee: member2,
        },
        {
          title: "Sitemap.xml & robots.txt auto-generator",
          description:
            "Generate search engine crawling files during Next.js build.",
          status: TaskStatus.DONE,
          priority: TaskPriority.LOW,
          dueDays: -8,
          creator: admin,
          assignee: member3,
        },
        {
          title: "Google PageSpeed 95+ score optimization",
          description:
            "Minify scripts, inline critical CSS, and defer non-essentialJS.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 12,
          creator: member1,
          assignee: member1,
        },
        {
          title: "reCAPTCHA v3 spam prevention on forms",
          description:
            "Prevent bot submissions on contact and demo request forms.",
          status: TaskStatus.DONE,
          priority: TaskPriority.MEDIUM,
          dueDays: -2,
          creator: member3,
          assignee: member2,
        },
        {
          title: "UTM campaign parameter tracking",
          description:
            "Store incoming query parameters in local storage for lead attribution.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          dueDays: 5,
          creator: admin,
          assignee: member3,
        },
        {
          title: "Enterprise ROI calculator widget",
          description:
            "Interactive savings calculator for prospective enterprise clients.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 14,
          creator: member2,
          assignee: member1,
        },
        {
          title: "Final QA signoff & DNS cutover",
          description:
            "Final marketing team approval and pointing root domain to Vercel.",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDays: 19,
          creator: admin,
          assignee: member2,
        },
      ],
    },
  ];

  // 4) Loop through and populate database
  for (const projectInput of projectsData) {
    // Create Project
    const project = await prisma.project.create({
      data: {
        name: projectInput.name,
        description: projectInput.description,
        creatorId: admin.id,
      },
    });

    // Assign all team members to the created project
    await prisma.projectMember.createMany({
      data: allUsers.map((user) => ({
        userId: user.id,
        projectId: project.id,
      })),
      skipDuplicates: true,
    });

    // Create tasks for the project
    await prisma.task.createMany({
      data: projectInput.tasks.map((task) => ({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * task.dueDays),
        projectId: project.id,
        creatorId: task.creator.id,
        assigneeId: task.assignee.id,
      })),
    });
  }

  console.log("✅ Seed completed successfully!");
  console.log("----------------------------------------");
  console.log("Admin   -> email: admin@example.com   | password: Admin123!");
  console.log("Member1 -> email: member@example.com  | password: Member123!");
  console.log("Member2 -> email: member2@example.com | password: Member123!");
  console.log("Member3 -> email: member3@example.com | password: Member123!");
  console.log("----------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
