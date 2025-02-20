
import ast
import random
import string
from typing import Dict

class CodeObfuscator:
    def __init__(self):
        self.name_mapping = {}
        
    def obfuscate_file(self, file_path: str) -> None:
        with open(file_path, 'r') as f:
            tree = ast.parse(f.read())
            
        self._obfuscate_names(tree)
        
        with open(file_path, 'w') as f:
            f.write(ast.unparse(tree))
            
    def _generate_name(self) -> str:
        return ''.join(random.choices(string.ascii_letters, k=16))
        
    def _obfuscate_names(self, tree: ast.AST) -> None:
        for node in ast.walk(tree):
            if isinstance(node, ast.Name):
                if node.id not in self.name_mapping:
                    self.name_mapping[node.id] = self._generate_name()
                node.id = self.name_mapping[node.id]
