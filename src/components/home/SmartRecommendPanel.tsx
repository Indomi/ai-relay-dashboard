"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Provider } from "@/lib/types";

interface SmartRecommendPanelProps {
  providers: Provider[];
  onRecommend: (recommendations: Provider[]) => void;
}

interface Option {
  value: string;
  label: string;
  emoji?: string;
  desc?: string;
}

const modelOptions: Option[] = [
  { value: "gpt", label: "OpenAI GPT-4o", emoji: "🤖" },
  { value: "claude", label: "Claude 3.5 Sonnet", emoji: "🧠" },
  { value: "gemini", label: "Gemini 1.5 Pro", emoji: "✨" },
  { value: "deepseek", label: "DeepSeek V3", emoji: "🔮" },
  { value: "multi", label: "多模型混用", emoji: "🌐" },
];

const usageOptions: Option[] = [
  { value: "api", label: "开发者接 API", desc: "需要稳定、并发、延迟低" },
  { value: "subscription", label: "个人订阅", desc: "ChatGPT Plus / Claude Pro 等" },
];

const budgetOptions: Option[] = [
  { value: "low", label: "< ¥100/月", desc: "轻度使用" },
  { value: "medium", label: "¥100-500/月", desc: "日常使用" },
  { value: "high", label: "> ¥500/月", desc: "重度使用" },
];

const priorityOptions: Option[] = [
  { value: "cheap", label: "便宜优先", emoji: "💰" },
  { value: "stable", label: "稳定优先", emoji: "🛡️" },
  { value: "support", label: "售后优先", emoji: "💁" },
];

export function SmartRecommendPanel({ providers, onRecommend }: SmartRecommendPanelProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    model: "",
    usage: "",
    budget: "",
    priority: "",
    region: "china",
  });

  const questions: { key: keyof typeof answers; title: string; options: Option[] }[] = [
    { key: "model", title: "你主要用什么模型？", options: modelOptions },
    { key: "usage", title: "你是买 API 还是订阅？", options: usageOptions },
    { key: "budget", title: "你的预算范围？", options: budgetOptions },
    { key: "priority", title: "你最看重什么？", options: priorityOptions },
  ];

  const currentQuestion = questions[step];

  const handleSelect = (key: keyof typeof answers, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));

    if (step < questions.length - 1) {
      setTimeout(() => setStep(step + 1), 300);
    }
  };

  const handleRecommend = () => {
    let filtered = [...providers];

    // 按模型过滤
    if (answers.model === "gpt") {
      filtered = filtered.filter((p) =>
        p.models.some((m) => m.model.toLowerCase().includes("gpt"))
      );
    } else if (answers.model === "claude") {
      filtered = filtered.filter((p) =>
        p.models.some((m) => m.model.toLowerCase().includes("claude"))
      );
    } else if (answers.model === "gemini") {
      filtered = filtered.filter((p) =>
        p.models.some((m) => m.model.toLowerCase().includes("gemini"))
      );
    }

    // 按用途过滤
    if (answers.usage === "api") {
      filtered = filtered.filter((p) => p.billingType !== "subscription");
    } else if (answers.usage === "subscription") {
      filtered = filtered.filter((p) => p.billingType !== "token");
    }

    // 按优先级排序
    if (answers.priority === "cheap") {
      filtered.sort((a, b) => {
        const aMin = Math.min(...a.models.map((m) => m.inputPrice || 0), Infinity);
        const bMin = Math.min(...b.models.map((m) => m.inputPrice || 0), Infinity);
        return aMin - bMin;
      });
    } else if (answers.priority === "stable") {
      filtered.sort((a, b) => (b.heatScore || 0) - (a.heatScore || 0));
    }

    onRecommend(filtered.slice(0, 3));
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          30 秒选到适合你的方案
        </CardTitle>
      </CardHeader>
      <CardContent>
        {step < questions.length ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">{currentQuestion.title}</p>
            <div className="grid grid-cols-1 gap-2">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(currentQuestion.key, option.value)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    answers[currentQuestion.key] === option.value
                      ? "border-blue-500 bg-blue-500/20"
                      : "border-slate-600 hover:border-slate-500 bg-slate-800/50"
                  }`}
                >
                  <span className="font-medium">
                    {option.emoji && `${option.emoji} `}{option.label}
                  </span>
                  {option.desc && (
                    <span className="text-xs text-slate-400 ml-2">{option.desc}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400 pt-2">
              <span>第 {step + 1}/{questions.length} 题</span>
              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i <= step ? "bg-blue-500" : "bg-slate-600"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">根据你的需求，我们推荐：</p>
            <button
              onClick={handleRecommend}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              🎯 生成推荐
            </button>
            <button
              onClick={() => setStep(0)}
              className="w-full text-sm text-slate-400 hover:text-slate-300"
            >
              重新选择
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
