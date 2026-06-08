// src/components/ui/Spinner.tsx
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: '2.5px solid rgba(0,0,0,0.1)',
        borderTopColor: '#6c63ff',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  );
}
