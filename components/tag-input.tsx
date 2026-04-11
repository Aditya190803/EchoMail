import { useId } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TagInputProps {
  label?: string;
  value: string;
  tags: string[];
  onValueChange: (value: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  placeholder?: string;
  helperText?: string;
}

export function TagInput({
  label = "Tags",
  value,
  tags,
  onValueChange,
  onAddTag,
  onRemoveTag,
  placeholder = "Add a tag...",
  helperText = "Press Enter or click Add to add a tag",
}: TagInputProps) {
  const inputId = useId();

  const handleAdd = () => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAddTag(trimmed);
      onValueChange("");
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          Add
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map((tag, index) => (
            <Badge
              key={`${tag}-${index}`}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemoveTag(tag)}
                className="ml-1 hover:text-destructive"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
}
