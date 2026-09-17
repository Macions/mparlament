// useCountdown.js
import { useEffect, useState } from "react";

export default function useCountdown(targetDate) {
    const target = targetDate ? new Date(targetDate).getTime() : null;

    const compute = () => {
        if (!target) return { text: "", diff: 0 };
        const diff = target - Date.now();
        return { text: formatRelative(diff, target), diff };
    };

    const [state, setState] = useState(compute);

    useEffect(() => {
        if (!target) return;

        let timer;

        const tick = () => {
            const next = compute();
            setState(next);

            const ms = Math.abs(next.diff);
            let delay;
            if (ms < 60_000) delay = 1_000;
            else if (ms < 60 * 60_000) delay = 10_000;
            else if (ms < 24 * 60 * 60_000) delay = 60_000;
            else delay = 5 * 60_000;

            timer = setTimeout(tick, delay);
        };

        timer = setTimeout(tick, 1_000);
        return () => clearTimeout(timer);
    }, [target]);

    return state;
}

function formatRelative(diff, targetDate) {
    if (diff <= 0) {
        const past = Math.abs(diff);
        if (past < 60_000) return "Zaraz się rozpocznie";
        if (past < 60 * 60_000) {
            const min = Math.floor(past / 60_000);
            return `Rozpoczęło się ${min} ${plural(min, "minutę", "minuty", "minut")} temu`;
        }
        return "Posiedzenie zakończone";
    }

    const now = new Date();
    const target = new Date(targetDate);

    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const daysDiff = Math.round(
        (startOfDay(target) - startOfDay(now)) / (24 * 60 * 60 * 1000),
    );

    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);
    const hrs = Math.floor(min / 60);

    if (daysDiff >= 2) return `Za ${daysDiff} ${plural(daysDiff, "dzień", "dni", "dni")}`;
    if (daysDiff === 1) return "Za 1 dzień";
    if (hrs >= 1) return `Za ${hrs} ${plural(hrs, "godzinę", "godziny", "godzin")}`;
    if (min >= 1) return `Za ${min} ${plural(min, "minutę", "minuty", "minut")}`;
    if (sec > 10) return `Za ${sec} ${plural(sec, "sekundę", "sekundy", "sekund")}`;
    return "Zaraz się rozpocznie";
}

function plural(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (n === 1) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
}