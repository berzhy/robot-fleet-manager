import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import Image from "next/image";

import styles from "./page.module.css";
import ThemeToggle from "./theme-toggle";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.toolbar}>
        <ThemeToggle />
      </header>
      <main className={styles.main}>
        <Image
          className={styles.logo}
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className={styles.intro}>
          <Typography component="h1" variant="h4" className={styles.heading}>
            To get started, edit the{" "}
            <code className={styles.code}>page.tsx</code> file.
          </Typography>
          <Typography color="text.secondary" className={styles.description}>
            Looking for a starting point or more instructions? Head over to{" "}
            <Link
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Templates
            </Link>{" "}
            or the{" "}
            <Link
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learning
            </Link>{" "}
            center.
          </Typography>
        </div>
        <div className={styles.ctas}>
          <Button
            variant="contained"
            size="large"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
            startIcon={
              <Image
                className={styles.logo}
                src="/vercel.svg"
                alt=""
                width={16}
                height={16}
              />
            }
          >
            Deploy Now
          </Button>
          <Button
            variant="outlined"
            size="large"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </Button>
        </div>
      </main>
    </div>
  );
}
