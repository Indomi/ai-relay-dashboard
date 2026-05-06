export function formatModelName(model: string): string {
  const nameMap: Record<string, string> = {
    "gpt-4o": "GPT-4o",
    "gpt-4o-mini": "GPT-4o Mini",
    "gpt-4-turbo": "GPT-4 Turbo",
    "claude-3.5-sonnet": "Claude 3.5 Sonnet",
    "claude-3-opus": "Claude 3 Opus",
    "gemini-2.0-flash": "Gemini 2.0 Flash",
    "gemini-2.5-pro": "Gemini 2.5 Pro",
    "deepseek-v3": "DeepSeek V3",
    "qwen-max": "Qwen Max",
    "llama-3.1-70b": "Llama 3.1 70B",
    "mixtral-8x22b": "Mixtral 8x22B",
  };
  return nameMap[model.toLowerCase()] || model;
}

export function formatPrice(price: number): string {
  return `¥${price.toFixed(1)}`;
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 30) return `${diffDays}天前`;
  return date.toLocaleDateString("zh-CN");
}

export function formatPlatformName(platform: string): string {
  const nameMap: Record<string, string> = {
    v2ex: "V2EX",
    nodeseek: "NodeSeek",
    "linux.do": "Linux.do",
    jike: "即刻",
    zhihu: "知乎",
    xiaohongshu: "小红书",
    telegram: "Telegram",
    github: "GitHub",
  };
  return nameMap[platform.toLowerCase()] || platform;
}

export function getPlatformColor(platform: string): string {
  const colorMap: Record<string, string> = {
    v2ex: "bg-gray-100 text-gray-700",
    nodeseek: "bg-blue-50 text-blue-700",
    "linux.do": "bg-indigo-50 text-indigo-700",
    jike: "bg-yellow-50 text-yellow-700",
    zhihu: "bg-blue-100 text-blue-800",
    xiaohongshu: "bg-red-50 text-red-700",
    telegram: "bg-sky-50 text-sky-700",
    github: "bg-gray-100 text-gray-800",
  };
  return colorMap[platform.toLowerCase()] || "bg-gray-100 text-gray-600";
}
