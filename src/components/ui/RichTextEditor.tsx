import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Underline,
  Heading,
  List,
  Link,
  Table,
  TableToolbar,
  Alignment,
  Font,
  Image,
  ImageToolbar,
  ImageCaption,
  ImageStyle,
  ImageResize,
  LinkImage,
  ImageInsert,
  Base64UploadAdapter
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import { FieldWrapper } from './FormField';

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ label, value, onChange, placeholder }: RichTextEditorProps) {
  return (
    <FieldWrapper label={label}>
      <div className="ckeditor-wrapper" style={{ minHeight: '200px' }}>
        <CKEditor
          editor={ClassicEditor}
          config={{
            licenseKey: 'GPL',
            plugins: [
              Essentials,
              Paragraph,
              Bold,
              Italic,
              Underline,
              Heading,
              List,
              Link,
              Table,
              TableToolbar,
              Alignment,
              Font,
              Image,
              ImageToolbar,
              ImageCaption,
              ImageStyle,
              ImageResize,
              LinkImage,
              ImageInsert,
              Base64UploadAdapter
            ],
            toolbar: [
              'undo', 'redo', '|',
              'heading', '|',
              'bold', 'italic', 'underline', '|',
              'fontSize', 'fontColor', 'fontBackgroundColor', '|',
              'alignment', '|',
              'bulletedList', 'numberedList', '|',
              'link', 'insertImage', 'insertTable'
            ],
            image: {
              toolbar: [
                'imageStyle:inline',
                'imageStyle:block',
                'imageStyle:side',
                '|',
                'toggleImageCaption',
                'imageTextAlternative',
                '|',
                'linkImage'
              ]
            },
            placeholder: placeholder || 'Nhập nội dung...',
          }}
          data={value}
          onChange={(_event, editor) => {
            const data = editor.getData();
            onChange(data);
          }}
        />
      </div>
    </FieldWrapper>
  );
}
