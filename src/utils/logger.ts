import chalk from "chalk";

export type LogLevel = "info" | "success" | "warn" | "error" | "debug" | "step";

export class Logger {
    private verbose: boolean;

    constructor(verbose = false) {
        this.verbose = verbose;
    }

    info(message: string): void {
        console.log(chalk.blue("ℹ"), chalk.gray(message));
    }

    success(message: string): void {
        console.log(chalk.green("✓"), message);
    }

    warn(message: string): void {
        console.log(chalk.yellow("⚠"), chalk.yellow(message));
    }

    error(message: string): void {
        console.error(chalk.red("✗"), chalk.red(message));
    }

    debug(message: string): void {
        if (this.verbose) {
            console.log(chalk.dim("  ·"), chalk.dim(message));
        }
    }

    step(stepNum: number, name: string, status: string): void {
        const num = chalk.bold(chalk.hex("#e8ff47")(`[${stepNum}]`));
        const label = chalk.white(name);
        const stat = this.formatStatus(status);
        console.log(`${num} ${label} ${stat}`);
    }

    private formatStatus(status: string): string {
        switch (status) {
            case "in_progress":
                return chalk.cyan("⟳ running");
            case "completed":
                return chalk.green("✓ done");
            case "failed":
                return chalk.red("✗ failed");
            case "skipped":
                return chalk.dim("— skipped");
            default:
                return chalk.gray(status);
        }
    }

    blank(): void {
        console.log();
    }

    divider(): void {
        console.log(chalk.dim("─".repeat(50)));
    }

    header(title: string): void {
        this.blank();
        console.log(chalk.bold(chalk.hex("#e8ff47")(`◆ ${title}`)));
        this.divider();
    }
}
