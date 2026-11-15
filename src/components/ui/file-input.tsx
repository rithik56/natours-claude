'use client';
// client: the preview is an object URL for a file the visitor picked in this browser, so it exists only on the client (R1)
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
} from 'react';
import styles from './file-input.module.css';

type FileInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'> & {
  label: string;
  name: string;
  accept?: string;
};

// Nothing uploads here. The preview is a local object URL, revoked when the file is replaced or the component unmounts (T-03-08).
export function FileInput({
  label,
  name,
  accept,
  onChange,
  ...rest
}: FileInputProps) {
  const id = useId();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextUrl = file ? URL.createObjectURL(file) : null;
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
    onChange?.(event);
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        {...rest}
        id={id}
        name={name}
        type="file"
        accept={accept}
        className={styles.input}
        onChange={handleChange}
      />
      {previewUrl ? (
        // A plain img: next/image cannot optimise a blob URL made in this browser, and the preview is not a served photo (U7 does not apply).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.preview}
          src={previewUrl}
          alt="Preview of the chosen photo"
          width={240}
          height={240}
        />
      ) : (
        <div className={styles.placeholder}>No photo chosen</div>
      )}
    </div>
  );
}
