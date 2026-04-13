# Web3Blackjack21

Web3Blackjack21 is a modern, full-stack Blackjack game featuring a clean UI and a robust cloud-native backend architecture.

## 🚀 Tech Stack

- **Frontend:** Vue 3 (Composition API), Pinia (State Management), Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** SQLite with Prisma ORM
- **Infrastructure & DevOps:** Containerized via Docker and orchestrated on **AWS EKS (Kubernetes)** using custom K8s Manifests and Ingress controllers.

## 🌟 Key Features

- **Fluid Gameplay:** Smooth dealing and shuffling animations powered by Vue 3 and CSS Transitions.
- **Data Persistence:** Integrated user authentication and dynamic real-time balance tracking utilizing Prisma.
- **Enterprise-Grade DevOps:** Moving beyond simple PaaS (like Vercel), this project leverages Infrastructure-as-Code (shell scripts + YAML) to spin up and manage a full Kubernetes cluster on AWS.

## 🛠 Project Structure

- `/client` - The Vue 3 frontend application.
- `/backend` - The Node.js / Express API service.
- `/eks` - The Kubernetes configuration files and deployment scripts.

## 🖥 Getting Started (Local Development)

You can spin up the environment quickly or run it locally by checking `process.md`. 
To deploy the whole architecture into the cloud, you can utilize the provided EKS scripts:

```bash
cd eks
bash 1_create_cluster.sh
bash 3_deploy_apps.sh
```

## 📝 Next Steps

- Move core Blackjack shuffling and verification logic entirely to the backend to prevent client-side cheating.
- Native Web3 Wallet (MetaMask) integration.
